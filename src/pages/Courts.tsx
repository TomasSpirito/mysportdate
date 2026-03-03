import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCourts, useSports, useFacility } from "@/hooks/use-supabase-data";
import { useTenantPath } from "@/hooks/use-tenant";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { MapPin } from "lucide-react";

const Courts = () => {
  const { sportId } = useParams();
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { data: sports = [] } = useSports();
  const { data: courts = [], isLoading } = useCourts(sportId);
  const { data: facility } = useFacility();
  const sport = sports.find((s) => s.id === sportId);

  if (!sport && !isLoading) return null;

  return (
    <PlayerLayout showBack backTo={tp("/")} title={sport?.name || "Canchas"}>
      <div className="container px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
            {sport?.icon} {sport?.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{courts.length} canchas disponibles</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {courts.map((court, i) => (
              <motion.div key={court.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                <button
                  onClick={() => navigate(tp(`/booking/${court.id}`))}
                  className="w-full glass-card rounded-2xl p-4 sm:p-5 text-left hover:shadow-xl transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base truncate">{court.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                          {court.surface}
                        </span>
                        {court.features.slice(0, 2).map((f) => (
                          <span key={f} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                            {f}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{facility?.name || "Complejo"}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg sm:text-xl font-extrabold text-primary">${court.price_per_hour.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">/hora</p>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PlayerLayout>
  );
};

export default Courts;
