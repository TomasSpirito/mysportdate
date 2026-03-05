import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { useCourt, useAddons, useCreateBooking } from "@/hooks/use-supabase-data";
import { useTenantPath } from "@/hooks/use-tenant";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { cn } from "@/lib/utils";
import { Check, MapPin, Clock, CreditCard, User, Mail, Phone, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Checkout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tp = useTenantPath();
  const courtId = params.get("court");
  const date = params.get("date");
  const time = params.get("time");
  const { data: court } = useCourt(courtId || undefined);
  const { data: addons = [] } = useAddons();
  const createBooking = useCreateBooking();

  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [payDeposit, setPayDeposit] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const endHour = time ? parseInt(time.split(":")[0]) + 1 : 0;
  const endTime = `${endHour.toString().padStart(2, "0")}:00`;
  const dateObj = date ? parse(date, "yyyy-MM-dd", new Date()) : new Date();

  // Handle MercadoPago return
  const mpStatus = params.get("status");
  const mpPaymentId = params.get("payment_id");
  const mpFailed = params.get("mp_failed");

  useEffect(() => {
    if (mpFailed === "1") {
      toast({ title: "El pago no se completó", description: "Podés intentar nuevamente.", variant: "destructive" });
      return;
    }

    if (mpStatus === "approved" && mpPaymentId && !isConfirming) {
      const stored = sessionStorage.getItem("pending_booking");
      if (!stored) return;
      setIsConfirming(true);
      const bookingData = JSON.parse(stored);
      sessionStorage.removeItem("pending_booking");

      createBooking
        .mutateAsync({
          court_id: bookingData.court_id,
          date: bookingData.date,
          time: bookingData.time,
          user_name: bookingData.user_name,
          user_email: bookingData.user_email,
          user_phone: bookingData.user_phone,
          total_price: bookingData.total_price,
          deposit_amount: bookingData.deposit_amount,
          payment_status: bookingData.payment_status,
          booking_type: "online",
          addon_ids: bookingData.addon_ids,
        })
        .then(() => {
          const confirmParams = new URLSearchParams({
            court: bookingData.court_id,
            courtName: bookingData.court_name,
            date: bookingData.date,
            time: bookingData.time,
            endTime: bookingData.end_time,
            total: bookingData.total_price.toString(),
            deposit: bookingData.deposit_amount.toString(),
            addons: (bookingData.addon_ids || []).join(","),
          });
          navigate(tp(`/confirmation?${confirmParams.toString()}`), { replace: true });
        })
        .catch((err: any) => {
          setIsConfirming(false);
          if (err?.message?.includes("SLOT_TAKEN")) {
            toast({ title: "¡Ese horario ya fue reservado!", description: "Elegí otro horario", variant: "destructive" });
          } else {
            toast({ title: "Error al crear la reserva", description: err?.message, variant: "destructive" });
          }
        });
    }
  }, [mpStatus, mpPaymentId, mpFailed]);

  const addonsTotal = useMemo(
    () => addons.filter((a) => selectedAddons.includes(a.id)).reduce((sum, a) => sum + a.price, 0),
    [selectedAddons, addons]
  );
  const total = (court?.price_per_hour || 0) + addonsTotal;
  const depositAmount = Math.round(total * 0.4);

  if (!court || !date || !time) return null;

  // Show loading while confirming booking after MP return
  if (isConfirming || (mpStatus === "approved" && mpPaymentId)) {
    return (
      <PlayerLayout title="Procesando...">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Confirmando tu reserva...</span>
        </div>
      </PlayerLayout>
    );
  }

  const toggleAddon = (id: string) =>
    setSelectedAddons((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const isValid = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && phone.trim().length >= 8;

  const handlePay = async () => {
    if (!isValid) {
      toast({ title: "Completá todos los campos correctamente", variant: "destructive" });
      return;
    }
    setIsProcessing(true);

    try {
      const amountToPay = payDeposit ? depositAmount : total;
      const paymentDesc = payDeposit
        ? `Seña - ${court.name} (${date} ${time})`
        : `Reserva - ${court.name} (${date} ${time})`;

      // Save booking data for after MercadoPago return
      sessionStorage.setItem(
        "pending_booking",
        JSON.stringify({
          court_id: courtId,
          court_name: court.name,
          date,
          time,
          end_time: endTime,
          user_name: name.trim(),
          user_email: email.trim(),
          user_phone: phone.trim(),
          total_price: total,
          deposit_amount: payDeposit ? depositAmount : total,
          payment_status: payDeposit ? "partial" : "full",
          addon_ids: selectedAddons,
        })
      );

      // Build return URL (same checkout page so we can process the booking)
      const currentUrl = window.location.href.split("?")[0];
      const backBase = `${currentUrl}?court=${courtId}&date=${date}&time=${time}`;

      const { data, error } = await supabase.functions.invoke("mercadopago-checkout", {
        body: {
          title: paymentDesc,
          unit_price: amountToPay,
          back_urls: {
            success: backBase,
            failure: `${backBase}&mp_failed=1`,
            pending: `${backBase}&mp_pending=1`,
          },
        },
      });

      if (error) throw error;

      const redirectUrl = data.init_point || data.sandbox_init_point;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error("No se obtuvo URL de pago de MercadoPago");
      }
    } catch (err: any) {
      toast({ title: "Error al iniciar el pago", description: err?.message, variant: "destructive" });
      setIsProcessing(false);
    }
  };

  return (
    <PlayerLayout showBack backTo={tp(`/booking/${courtId}`)} title="Checkout">
      <div className="container px-4 py-6 pb-32">
        {/* Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 mb-4">
          <h3 className="font-extrabold text-lg mb-3">Resumen de tu reserva</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary shrink-0" /><span className="font-medium truncate">{court.name}</span><span className="ml-auto text-muted-foreground shrink-0">{court.surface}</span></div>
            <div className="flex items-center gap-2 flex-wrap"><Clock className="w-4 h-4 text-primary shrink-0" /><span className="truncate">{format(dateObj, "EEEE d 'de' MMMM", { locale: es })}</span><span className="ml-auto font-semibold shrink-0">{time} - {endTime}</span></div>
          </div>
        </motion.div>

        {/* Contact info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-5 mb-4">
          <h3 className="font-bold text-sm mb-3">Tus datos</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 border border-border rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <input type="text" placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0" />
            </div>
            <div className="flex items-center gap-3 border border-border rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0" />
            </div>
            <div className="flex items-center gap-3 border border-border rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <input type="tel" placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0" />
            </div>
          </div>
        </motion.div>

        {/* Addons */}
        {addons.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 mb-4">
            <h3 className="font-bold text-sm mb-3">¿Querés agregar extras?</h3>
            <div className="space-y-2">
              {addons.map((addon) => {
                const isSelected = selectedAddons.includes(addon.id);
                return (
                  <button key={addon.id} onClick={() => toggleAddon(addon.id)}
                    className={cn("w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                    <span className="text-xl shrink-0">{addon.icon}</span>
                    <span className="flex-1 font-medium text-sm min-w-0 truncate">{addon.name}</span>
                    <span className="text-sm font-bold shrink-0">+${addon.price.toLocaleString()}</span>
                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                      isSelected ? "bg-primary border-primary" : "border-border")}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Payment */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-5 mb-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Forma de pago</h3>
          <div className="space-y-2">
            <button onClick={() => setPayDeposit(true)} className={cn("w-full p-3 rounded-xl border transition-all text-left", payDeposit ? "border-primary bg-primary/5" : "border-border")}>
              <p className="font-semibold text-sm">Seña (40%)</p>
              <p className="text-xs text-muted-foreground">Pagás ${depositAmount.toLocaleString()} ahora, el resto al llegar</p>
            </button>
            <button onClick={() => setPayDeposit(false)} className={cn("w-full p-3 rounded-xl border transition-all text-left", !payDeposit ? "border-primary bg-primary/5" : "border-border")}>
              <p className="font-semibold text-sm">Pago total</p>
              <p className="text-xs text-muted-foreground">Pagás ${total.toLocaleString()} y listo</p>
            </button>
          </div>
        </motion.div>

        {/* Bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border z-30">
          <div className="container">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-extrabold text-lg">${total.toLocaleString()}</span>
            </div>
            <button onClick={handlePay} disabled={isProcessing || !isValid}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              {isProcessing
                ? "Redirigiendo a MercadoPago..."
                : payDeposit
                ? `Pagar seña $${depositAmount.toLocaleString()}`
                : `Pagar $${total.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </PlayerLayout>
  );
};

export default Checkout;
