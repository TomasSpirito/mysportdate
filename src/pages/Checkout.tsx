import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { useCourt, useAddons } from "@/hooks/use-supabase-data";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { cn } from "@/lib/utils";
import { Check, MapPin, Clock, CreditCard } from "lucide-react";

const Checkout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const courtId = params.get("court");
  const date = params.get("date");
  const time = params.get("time");
  const { data: court } = useCourt(courtId || undefined);
  const { data: addons = [] } = useAddons();
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [payDeposit, setPayDeposit] = useState(true);

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

  const handlePay = () => {
    const confirmParams = new URLSearchParams({
      court: courtId!,
      courtName: court.name,
      date,
      time,
      endTime,
      total: total.toString(),
      deposit: payDeposit ? depositAmount.toString() : total.toString(),
      addons: selectedAddons.join(","),
    });
    navigate(`/confirmation?${confirmParams.toString()}`);
  };

  return (
    <PlayerLayout showBack backTo={`/booking/${courtId}`} title="Checkout">
      <div className="container py-6 pb-32">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 mb-4">
          <h3 className="font-extrabold text-lg mb-3">Resumen de tu reserva</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium">{court.name}</span>
              <span className="ml-auto text-muted-foreground">{court.surface}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>{format(dateObj, "EEEE d 'de' MMMM", { locale: es })}</span>
              <span className="ml-auto font-semibold">{time} - {endTime}</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 mb-4">
          <h3 className="font-bold text-sm mb-3">¿Querés agregar extras?</h3>
          <div className="space-y-2">
            {addons.map((addon) => {
              const isSelected = selectedAddons.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  )}
                >
                  <span className="text-xl">{addon.icon}</span>
                  <span className="flex-1 font-medium text-sm">{addon.name}</span>
                  <span className="text-sm font-bold">+${addon.price.toLocaleString()}</span>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    isSelected ? "bg-primary border-primary" : "border-border"
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-5 mb-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Forma de pago
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => setPayDeposit(true)}
              className={cn(
                "w-full p-3 rounded-xl border transition-all text-left",
                payDeposit ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <p className="font-semibold text-sm">Seña (40%)</p>
              <p className="text-xs text-muted-foreground">Pagás ${depositAmount.toLocaleString()} ahora, el resto al llegar</p>
            </button>
            <button
              onClick={() => setPayDeposit(false)}
              className={cn(
                "w-full p-3 rounded-xl border transition-all text-left",
                !payDeposit ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <p className="font-semibold text-sm">Pago total</p>
              <p className="text-xs text-muted-foreground">Pagás ${total.toLocaleString()} y listo</p>
            </button>
          </div>
        </motion.div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border">
          <div className="container">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-extrabold text-lg">${total.toLocaleString()}</span>
            </div>
            <button onClick={handlePay} className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
              {payDeposit ? `Pagar seña $${depositAmount.toLocaleString()}` : `Pagar $${total.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </PlayerLayout>
  );
};

export default Checkout;
