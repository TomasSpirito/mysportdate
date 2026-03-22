import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
// IMPORTAMOS useFacility y useCreateBooking
import { useCourt, useAddons, useFacility, useCreateBooking } from "@/hooks/use-supabase-data";
import { useTenantPath } from "@/hooks/use-tenant";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { cn } from "@/lib/utils";
import { Check, Clock, CreditCard, User, Mail, Phone, Loader2, Trophy, Calendar, ShieldCheck, Banknote } from "lucide-react";
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
  const { data: facility } = useFacility(); // TRAEMOS LA CONFIGURACIÓN DEL PREDIO
  const createBooking = useCreateBooking(); // TRAEMOS EL MUTATOR PARA RESERVAS DE $0

  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [payDeposit, setPayDeposit] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const endHour = time ? parseInt(time.split(":")[0]) + 1 : 0;
  const endTime = `${endHour.toString().padStart(2, "0")}:00`;
  const dateObj = date ? parse(date, "yyyy-MM-dd", new Date()) : new Date();

  const mpStatus = params.get("status");
  const mpFailed = params.get("mp_failed");

  const addonsTotal = useMemo(() => addons.filter((a) => selectedAddons.includes(a.id)).reduce((sum, a) => sum + a.price, 0), [selectedAddons, addons]);
  
  const total = court ? (court.price_per_hour + addonsTotal) : 0;

  // LÓGICA DE SEÑA DINÁMICA BASADA EN LA CONFIGURACIÓN
  const requiresDeposit = facility?.requires_deposit ?? false;
  const depositPercentage = facility?.deposit_percentage ?? 50;
  // Si exige seña, calcula el %. Si no, la opción "payDeposit" actuará como "Pago en predio" ($0)
  const depositAmount = requiresDeposit ? Math.round(total * (depositPercentage / 100)) : 0;

  useEffect(() => {
    if (mpFailed === "1" || mpStatus === "failure" || mpStatus === "null") {
      toast({ title: "El pago no se completó", description: "Podés intentar nuevamente.", variant: "destructive" });
      return;
    }

    if (mpStatus === "approved" && !isConfirming && court) {
      setIsConfirming(true);
      const confirmParams = new URLSearchParams({
        court: courtId || "", courtName: court.name, date: date || "", time: time || "", endTime: endTime,
        total: total.toString(), deposit: payDeposit ? depositAmount.toString() : total.toString(), addons: selectedAddons.join(","),
      });
      navigate(tp(`/confirmation?${confirmParams.toString()}`), { replace: true });
    }
  }, [mpStatus, mpFailed, isConfirming, navigate, tp, courtId, court, date, time, endTime, total, payDeposit, depositAmount, selectedAddons]);

  if (isConfirming || mpStatus === "approved") {
    return (
      <PlayerLayout title="Procesando...">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Generando tu comprobante...</span>
        </div>
      </PlayerLayout>
    );
  }

  if (!court || !date || !time) return null;

  const toggleAddon = (id: string) => setSelectedAddons((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  // EXPRESIONES REGULARES (REGEX) PARA VALIDACIÓN REAL
  const isNameValid = name.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPhoneValid = /^[0-9+\-\s()]{8,20}$/.test(phone.trim());
  const isValid = isNameValid && isEmailValid && isPhoneValid;

  const handlePay = async () => {
    if (!isValid) {
      setShowErrors(true);
      toast({ title: "Revisá los datos ingresados", description: "Asegurate de que el correo y el teléfono tengan un formato válido.", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    setShowErrors(false);

    try {
      const amountToPay = payDeposit ? depositAmount : total;

      // BY-PASS: Si el monto a pagar es $0 (Pago en el club sin seña obligatoria)
      if (amountToPay === 0) {
          await createBooking.mutateAsync({
              court_id: courtId!, date: date, time: time,
              user_name: name.trim(), user_email: email.trim(), user_phone: phone.trim(),
              total_price: total, deposit_amount: 0, payment_status: "none", booking_type: "online",
          } as any);
          
          const confirmParams = new URLSearchParams({
            court: courtId || "", courtName: court.name, date: date || "", time: time || "", endTime: endTime,
            total: total.toString(), deposit: "0", addons: selectedAddons.join(","),
          });
          navigate(tp(`/confirmation?${confirmParams.toString()}`), { replace: true });
          return;
      }

      // SI HAY QUE PAGAR ALGO, VAMOS A MERCADO PAGO
      const paymentDesc = payDeposit ? `Seña - ${court.name} (${date} ${time})` : `Reserva - ${court.name} (${date} ${time})`;
      const currentUrl = window.location.href.split("?")[0];
      const backBase = `${currentUrl}?court=${courtId}&date=${date}&time=${time}`;

      const { data, error } = await supabase.functions.invoke("mercadopago-checkout", {
        body: {
          title: paymentDesc, unit_price: amountToPay,
          booking_data: {
            court_id: courtId, date: date, time: time, user_name: name.trim(), user_email: email.trim(), user_phone: phone.trim(),
            total_price: total, deposit_amount: payDeposit ? depositAmount : total, payment_status: payDeposit ? "partial" : "full", addon_ids: selectedAddons.join(","),
          },
          back_urls: { success: `${backBase}&status=approved`, failure: `${backBase}&status=failure`, pending: `${backBase}&status=pending` },
        },
      });

      if (error) throw error;
      if (data.init_point || data.sandbox_init_point) {
        window.location.href = data.init_point || data.sandbox_init_point;
      } else {
        throw new Error("No se obtuvo URL de pago de MercadoPago");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
      toast({ title: "Error al generar la reserva", description: errorMsg, variant: "destructive" });
      setIsProcessing(false);
    }
  };

  const amountToPayNow = payDeposit ? depositAmount : total;

  return (
    <PlayerLayout showBack backTo={tp(`/booking/${courtId}`)} title="Reserva">
      <div className="container max-w-3xl mx-auto px-4 py-6 pb-32">
        
        {/* Resumen */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm mb-6 flex flex-col sm:flex-row">
            <div className="w-full sm:w-48 h-36 sm:h-auto bg-muted shrink-0 relative border-b sm:border-b-0 sm:border-r border-border/50">
                {court.image_url ? (
                    <img src={court.image_url} alt={court.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-muted flex items-center justify-center">
                        <Trophy className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                )}
            </div>
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-3 gap-2">
                    <h3 className="font-extrabold text-xl text-foreground">{court.name}</h3>
                    <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0">{court.surface}</span>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium capitalize text-foreground/80">{format(dateObj, "EEEE d 'de' MMMM", { locale: es })}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium text-foreground/80">{time} a {endTime} hs</span>
                    </div>
                </div>
            </div>
        </motion.div>

        {/* Contact info con validación visual en rojo */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-5 mb-5 shadow-sm border border-border/50">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Tus datos</h3>
          <div className="space-y-3">
            
            <div className={cn("flex items-center gap-3 border rounded-xl px-3.5 py-3 transition-all bg-background/50", showErrors && !isNameValid ? "border-destructive/80 text-destructive focus-within:ring-1 focus-within:ring-destructive/20 bg-destructive/5" : "border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20")}>
              <User className={cn("w-4 h-4 shrink-0", showErrors && !isNameValid ? "text-destructive" : "text-muted-foreground")} />
              <input type="text" placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} 
                className={cn("flex-1 bg-transparent text-sm font-medium outline-none min-w-0 placeholder:font-normal", showErrors && !isNameValid ? "placeholder:text-destructive/60" : "placeholder:text-muted-foreground")} />
            </div>

            <div className={cn("flex items-center gap-3 border rounded-xl px-3.5 py-3 transition-all bg-background/50", showErrors && !isEmailValid ? "border-destructive/80 text-destructive focus-within:ring-1 focus-within:ring-destructive/20 bg-destructive/5" : "border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20")}>
              <Mail className={cn("w-4 h-4 shrink-0", showErrors && !isEmailValid ? "text-destructive" : "text-muted-foreground")} />
              <input type="email" placeholder="Correo electrónico válido" value={email} onChange={(e) => setEmail(e.target.value)} 
                className={cn("flex-1 bg-transparent text-sm font-medium outline-none min-w-0 placeholder:font-normal", showErrors && !isEmailValid ? "placeholder:text-destructive/60" : "placeholder:text-muted-foreground")} />
            </div>

            <div className={cn("flex items-center gap-3 border rounded-xl px-3.5 py-3 transition-all bg-background/50", showErrors && !isPhoneValid ? "border-destructive/80 text-destructive focus-within:ring-1 focus-within:ring-destructive/20 bg-destructive/5" : "border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20")}>
              <Phone className={cn("w-4 h-4 shrink-0", showErrors && !isPhoneValid ? "text-destructive" : "text-muted-foreground")} />
              <input type="tel" placeholder="Número de WhatsApp o Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} 
                className={cn("flex-1 bg-transparent text-sm font-medium outline-none min-w-0 placeholder:font-normal", showErrors && !isPhoneValid ? "placeholder:text-destructive/60" : "placeholder:text-muted-foreground")} />
            </div>

          </div>
        </motion.div>

        {/* Addons */}
        {addons.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 mb-5 shadow-sm border border-border/50">
            <h3 className="font-bold text-base mb-4">¿Querés agregar extras?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {addons.map((addon) => {
                const isSelected = selectedAddons.includes(addon.id);
                return (
                  <button key={addon.id} onClick={() => toggleAddon(addon.id)}
                    className={cn("w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left bg-background/50",
                      isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/30")}>
                    <span className="text-2xl shrink-0">{addon.icon}</span>
                    <span className="flex-1 font-medium text-sm min-w-0 truncate">{addon.name}</span>
                    <span className="text-sm font-bold shrink-0 text-primary">+${addon.price.toLocaleString()}</span>
                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0", isSelected ? "bg-primary border-primary" : "border-border")}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Payment Options (DINÁMICAS SEGÚN CONFIGURACIÓN) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-5 mb-4 shadow-sm border border-border/50">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Opción de pago</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <button onClick={() => setPayDeposit(true)} className={cn("w-full p-4 rounded-xl border-2 transition-all text-left bg-background/50", payDeposit ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/30")}>
              <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-sm">{requiresDeposit ? `Seña (${depositPercentage}%)` : "Pago en el predio"}</p>
                  {payDeposit && <div className="w-2 h-2 rounded-full bg-primary"></div>}
              </div>
              <p className="text-xs text-muted-foreground">
                  {requiresDeposit 
                    ? <>Pagás <strong className="text-foreground">${depositAmount.toLocaleString()}</strong> ahora, el resto al llegar.</> 
                    : <>Reservás gratis y pagás <strong className="text-foreground">${total.toLocaleString()}</strong> al llegar al club.</>}
              </p>
            </button>
            
            <button onClick={() => setPayDeposit(false)} className={cn("w-full p-4 rounded-xl border-2 transition-all text-left bg-background/50", !payDeposit ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/30")}>
              <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-sm">Pago Total</p>
                  {!payDeposit && <div className="w-2 h-2 rounded-full bg-primary"></div>}
              </div>
              <p className="text-xs text-muted-foreground">Pagás <strong className="text-foreground">${total.toLocaleString()}</strong> ahora por Mercado Pago y te olvidás.</p>
            </button>

          </div>
        </motion.div>

        {/* Bottom bar mejorada */}
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-5 bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-30">
          <div className="container max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground tracking-wider mb-0.5 block">A pagar ahora</span>
              <span className="text-2xl sm:text-3xl font-black text-foreground leading-none">${amountToPayNow.toLocaleString()}</span>
            </div>
            
            <button onClick={handlePay} disabled={isProcessing}
              className={cn("text-white px-5 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base shadow-lg transition-all flex items-center gap-2 shrink-0", 
              isProcessing ? "bg-muted-foreground opacity-50 cursor-not-allowed" : amountToPayNow > 0 ? "bg-[#009EE3] hover:bg-[#008cc9] hover:shadow-xl hover:scale-105 active:scale-95" : "bg-primary hover:bg-primary/90 hover:shadow-xl hover:scale-105 active:scale-95")}>
              {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
              ) : amountToPayNow > 0 ? (
                  <ShieldCheck className="w-5 h-5 hidden sm:block" />
              ) : (
                  <Banknote className="w-5 h-5 hidden sm:block" />
              )}
              
              {isProcessing ? "Procesando..." : amountToPayNow > 0 ? "Pagar con Mercado Pago" : "Confirmar Reserva"}
            </button>
          </div>
        </div>
      </div>
    </PlayerLayout>
  );
};

export default Checkout;