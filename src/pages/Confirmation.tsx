import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { useFacility } from "@/hooks/use-supabase-data";
import { useTenantPath } from "@/hooks/use-tenant";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { CheckCircle2, MessageCircle, Copy, Home } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Confirmation = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { data: facility } = useFacility();

  const facilityName = facility?.name || "Mi Predio";
  const courtName = params.get("courtName") || "";
  const date = params.get("date") || "";
  const time = params.get("time") || "";
  const endTime = params.get("endTime") || "";
  const total = parseInt(params.get("total") || "0");
  const deposit = parseInt(params.get("deposit") || "0");
  const perPerson = Math.round(total / 10);

  const dateObj = date ? parse(date, "yyyy-MM-dd", new Date()) : new Date();
  const formattedDate = format(dateObj, "EEEE d 'de' MMMM", { locale: es });

  const whatsappText = `⚽ *Reserva confirmada en ${facilityName}!*\n\n📍 ${courtName}\n📅 ${formattedDate}\n⏰ ${time} - ${endTime}\n💰 Total: $${total.toLocaleString()}\n👥 Son aprox $${perPerson.toLocaleString()} por persona\n\n¡No falten! 💪`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappText.replace(/\*/g, ""));
    toast({ title: "Copiado al portapapeles" });
  };

  return (
    <PlayerLayout>
      <div className="container px-4 py-10 text-center max-w-md mx-auto">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-4" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-2xl font-extrabold mb-1">¡Reserva confirmada!</h1>
          <p className="text-sm text-muted-foreground mb-6">Tu turno está asegurado</p>

          <div className="glass-card rounded-2xl p-5 text-left mb-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Cancha</span><span className="font-semibold text-right truncate">{courtName}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Fecha</span><span className="font-semibold capitalize text-right truncate">{formattedDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Horario</span><span className="font-semibold">{time} - {endTime}</span></div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-extrabold text-base">${total.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pagado</span><span className="font-semibold text-primary">${deposit.toLocaleString()}</span></div>
              {total > deposit && (
                <div className="flex justify-between"><span className="text-muted-foreground">Resta abonar</span><span className="font-semibold text-accent">${(total - deposit).toLocaleString()}</span></div>
              )}
            </div>
          </div>

          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[hsl(142,70%,45%)] text-white py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity mb-3">
            <MessageCircle className="w-5 h-5" /> Enviar al grupo de WhatsApp
          </a>
          <button onClick={handleCopy} className="flex items-center justify-center gap-2 w-full border border-border py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
            <Copy className="w-4 h-4" /> Copiar resumen
          </button>
          <button onClick={() => navigate(tp("/"))} className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" /> Volver al inicio
          </button>
        </motion.div>
      </div>
    </PlayerLayout>
  );
};

export default Confirmation;
