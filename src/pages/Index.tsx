import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSports, useCourts, useFacility } from "@/hooks/use-supabase-data";
import { useTenantPath } from "@/hooks/use-tenant";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { data: sports = [], isLoading } = useSports();
  const { data: courts = [] } = useCourts();
  const { data: facility } = useFacility();

  const facilityName = facility?.name || "Mi Predio";
  const whatsappUrl = facility?.whatsapp ? `https://wa.me/${facility.whatsapp}` : null;

  // Only show sports that have courts in this facility
  const availableSports = sports.filter(s => courts.some(c => c.sport_id === s.id));

  return (
    <PlayerLayout>
      {/* Hero */}
      <section className="bg-secondary text-secondary-foreground pb-10 pt-6">
        <div className="container px-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
              {facilityName}
            </h1>
            <p className="text-base sm:text-lg font-medium text-gradient-brand mb-2">Reservá tu cancha al instante</p>
            <p className="text-sm text-sidebar-foreground opacity-70 mb-6 max-w-sm">
              Elegí tu deporte, encontrá horarios libres y reservá en segundos.
            </p>
          </motion.div>
          {facility?.location && (
            <div className="flex items-center gap-2 text-xs text-sidebar-foreground opacity-50 mb-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{facility.location}</span>
            </div>
          )}
        </div>
      </section>

      {/* Sport selection */}
      <section className="container px-4 -mt-5">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-6 animate-pulse h-32" />
            ))}
          </div>
        ) : availableSports.length === 0 ? (
          <div className="text-center py-10 bg-muted/50 rounded-2xl">
            <p className="text-2xl mb-2">🏟️</p>
            <p className="text-sm font-semibold text-muted-foreground">Este predio aún no tiene canchas configuradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {availableSports.map((sport, i) => (
              <motion.button
                key={sport.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                onClick={() => navigate(tp(`/courts/${sport.id}`))}
                className="glass-card rounded-2xl p-6 text-left hover:shadow-xl hover:scale-[1.02] transition-all group"
              >
                <span className="text-4xl block mb-3">{sport.icon}</span>
                <h3 className="font-bold text-lg text-foreground">{sport.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Ver canchas disponibles →</p>
              </motion.button>
            ))}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="container px-4 mt-10 mb-10">
        <div className="flex flex-col sm:flex-row gap-4">
          {[
            { icon: "⚡", title: "Reserva instantánea", desc: "Elegí y reservá en menos de 1 minuto" },
            { icon: "💰", title: "Señá parcial", desc: "Pagá solo una parte para asegurar tu turno" },
            { icon: "📲", title: "Compartí por WhatsApp", desc: "Avisá a tu grupo con un solo toque" },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
              <span className="text-2xl shrink-0">{f.icon}</span>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm">{f.title}</h4>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact section */}
      {facility && (facility.phone || facility.email || facility.whatsapp || facility.location) && (
        <section className="container px-4 mb-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="glass-card rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-4">📍 Contacto</h2>
            <div className="space-y-3">
              {facility.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="break-words min-w-0">{facility.location}</span>
                </div>
              )}
              {facility.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <a href={`tel:${facility.phone}`} className="hover:underline break-all">{facility.phone}</a>
                </div>
              )}
              {facility.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <a href={`mailto:${facility.email}`} className="hover:underline break-all">{facility.email}</a>
                </div>
              )}
            </div>
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 bg-[hsl(142,70%,45%)] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                <MessageCircle className="w-4 h-4" /> Escribinos por WhatsApp
              </a>
            )}
          </motion.div>
        </section>
      )}
    </PlayerLayout>
  );
};

export default Index;
