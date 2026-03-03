import { useState, useMemo } from "react";
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

  const endHour = time ? parseInt(time.split(":")[0]) + 1 : 0;
  const endTime = `${endHour.toString().padStart(2, "0")}:00`;
  const dateObj = date ? parse(date, "yyyy-MM-dd", new Date()) : new Date();

  const addonsTotal = useMemo(
    () => addons.filter((a) => selectedAddons.includes(a.id)).reduce((sum, a) => sum + a.price, 0),
    [selectedAddons, addons]
  );
  const total = (court?.price_per_hour || 0) + addonsTotal;
  const depositAmount = Math.round(total * 0.4);

  if (!court || !date || !time) return null;

  const toggleAddon = (id: string) =>
    setSelectedAddons((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const isValid = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && phone.trim().length >= 8;

  const handlePay = async () => {
    if (!isValid) { toast({ title: "Completá todos los campos correctamente", variant: "destructive" }); return; }
    try {
      await createBooking.mutateAsync({
        court_id: courtId!, date, time,
        user_name: name.trim(), user_email: email.trim(), user_phone: phone.trim(),
        total_price: total,
        deposit_amount: payDeposit ? depositAmount : total,
        payment_status: payDeposit ? "partial" : "full",
        booking_type: "online",
        addon_ids: selectedAddons,
      });
      const confirmParams = new URLSearchParams({
        court: courtId!, courtName: court.name, date, time, endTime,
        total: total.toString(), deposit: payDeposit ? depositAmount.toString() : total.toString(),
        addons: selectedAddons.join(","),
      });
      navigate(tp(`/confirmation?${confirmParams.toString()}`));
    } catch (err: any) {
      if (err?.message?.includes("SLOT_TAKEN")) {
        toast({ title: "¡Ese horario ya fue reservado!", description: "Elegí otro horario", variant: "destructive" });
      } else {
        toast({ title: "Error al reservar", description: err?.message, variant: "destructive" });
      }
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
            <button onClick={handlePay} disabled={createBooking.isPending || !isValid}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {createBooking.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {payDeposit ? `Pagar seña $${depositAmount.toLocaleString()}` : `Pagar $${total.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </PlayerLayout>
  );
};

export default Checkout;
