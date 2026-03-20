import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCourts, useSports, useFacility } from "@/hooks/use-supabase-data";
import { useTenantPath } from "@/hooks/use-tenant";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { MapPin, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

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
      {/* FIX 1: max-w-6xl y mx-auto para centrar y contener la grilla en pantallas muy grandes */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
            <span className="text-3xl">{sport?.icon}</span> {sport?.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">{courts.length} canchas disponibles en {facility?.name || "el predio"}</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-3xl p-0 animate-pulse h-72 overflow-hidden border border-border/50">
                  <div className="w-full h-44 bg-muted/60"></div>
                  <div className="p-5 space-y-3">
                      <div className="h-5 bg-muted/60 rounded w-1/2"></div>
                      <div className="h-4 bg-muted/60 rounded w-1/3"></div>
                  </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courts.map((court, i) => (
              <motion.div key={court.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <button
                  onClick={() => navigate(tp(`/booking/${court.id}`))}
                  // Agregamos hover:-translate-y-1 para que la tarjeta flote sutilmente al pasar el mouse
                  className="w-full bg-card rounded-3xl text-left overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group border border-border flex flex-col h-full hover:-translate-y-1"
                >
                  {/* Contenedor de Imagen */}
                  <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden shrink-0">
                    {court.image_url ? (
                        <img 
                            src={court.image_url} 
                            alt={court.name} 
                            // Transición más lenta (duration-700) para darle efecto cinemático
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-muted flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                            <span className="text-6xl drop-shadow-sm opacity-60">{sport?.icon || <Trophy className="w-12 h-12 text-muted-foreground/40"/>}</span>
                        </div>
                    )}
                    
                    {/* Badge Flotante del Precio */}
                    <div className="absolute top-3 right-3 bg-background/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-sm border border-border/50 flex items-baseline gap-1">
                        <span className="font-extrabold text-primary">${court.price_per_hour.toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase">/hora</span>
                    </div>
                  </div>

                  {/* Contenido de la Tarjeta */}
                  <div className="p-5 flex flex-col flex-1 bg-gradient-to-b from-transparent to-muted/5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-lg truncate text-foreground group-hover:text-primary transition-colors">{court.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{facility?.name || "Complejo Deportivo"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags y Features */}
                    <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-border/40">
                        {/* Superficie (Destacada) */}
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                          {court.surface}
                        </span>
                        
                        {/* FIX 2: Features con bg-secondary y sombra para destacarlos */}
                        {court.features.map((f) => (
                          <span key={f} className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-[11px] font-medium border border-border/50 shadow-sm">
                            {f}
                          </span>
                        ))}
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