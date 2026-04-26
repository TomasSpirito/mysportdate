import { motion } from "framer-motion";
import { Lock, MessageCircle, CheckCircle2, Clock } from "lucide-react";

interface Props {
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
}

const SubscriptionGate = ({ subscriptionStatus, trialEndsAt }: Props) => {
  const trialExpired =
    subscriptionStatus === "trial" &&
    trialEndsAt != null &&
    new Date(trialEndsAt) <= new Date();

  const isBlocked =
    trialExpired ||
    subscriptionStatus === "expired" ||
    subscriptionStatus === "cancelled";

  if (!isBlocked) return null;

  const trialEndDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(10, 13, 20, 0.97)", backdropFilter: "blur(8px)" }}>

      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/[0.06] rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md bg-[#161b26] border border-white/[0.08] rounded-[1.75rem] p-8 shadow-2xl shadow-black/60 text-center"
      >
        {/* Icon */}
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="text-red-400" size={28} />
        </div>

        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
          {trialExpired ? "Período de prueba finalizado" : "Suscripción inactiva"}
        </h2>

        {trialEndDate && (
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-4">
            <Clock size={12} />
            Tu prueba venció el {trialEndDate}
          </div>
        )}

        <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
          Para seguir gestionando tu predio con MySportdate, activá tu suscripción mensual.
        </p>

        {/* Features */}
        <div className="space-y-2.5 mb-8 text-left">
          {[
            "Reservas y agenda ilimitadas",
            "Cobro automático con Mercado Pago",
            "Módulo Buffet / POS",
            "Analíticas y control de gastos",
            "Soporte WhatsApp ilimitado",
          ].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span className="text-sm text-slate-300 font-medium">{f}</span>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 mb-6">
          <p className="text-4xl font-black text-white mb-1">
            $15.000
            <span className="text-base text-slate-500 font-semibold">/mes</span>
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Costo fijo. Sin comisiones ocultas. Cancelá cuando quieras.
          </p>
        </div>

        {/* CTA */}
        <a
          href="https://wa.me/5491100000000?text=Hola!%20Quiero%20activar%20mi%20suscripci%C3%B3n%20a%20MySportdate"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-sm text-white transition-all shadow-lg"
          style={{ background: "#25D366", boxShadow: "0 4px 20px rgba(37,211,102,0.25)" }}
        >
          <MessageCircle size={18} className="fill-white" />
          Activar suscripción por WhatsApp
        </a>

        <p className="mt-4 text-xs text-slate-600 font-medium">
          También podés escribirnos a{" "}
          <a href="mailto:contacto@mysportdate.com" className="text-emerald-500 hover:underline">
            contacto@mysportdate.com
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default SubscriptionGate;
