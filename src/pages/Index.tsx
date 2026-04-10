import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSports, useCourts, useFacility, useFacilitySchedules } from "@/hooks/use-supabase-data";
import { useTenantPath } from "@/hooks/use-tenant";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { Loader2, MapPin, Phone, Mail, MessageCircle, Instagram, Map, Clock, ChevronRight, Trophy, Info, Star, Wifi, ParkingCircle, Shirt, ShowerHead, Coffee, UtensilsCrossed, PartyPopper, ShieldCheck, Lamp } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// NUEVO: Ayudante para asignar íconos según el servicio
const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes("wifi")) return Wifi;
    if (lower.includes("estacionamiento")) return ParkingCircle;
    if (lower.includes("vestuarios")) return Shirt;
    if (lower.includes("duchas")) return ShowerHead;
    if (lower.includes("buffet") || lower.includes("bar")) return Coffee;
    if (lower.includes("parrilla")) return UtensilsCrossed;
    if (lower.includes("cumpleaños") || lower.includes("eventos")) return PartyPopper;
    if (lower.includes("seguridad")) return ShieldCheck;
    if (lower.includes("led") || lower.includes("iluminación")) return Lamp;
    return Star; // Ícono por defecto para personalizados
};

const Index = () => {
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { data: sports = [], isLoading: loadingSports } = useSports();
  const { data: courts = [] } = useCourts();
  const { data: facility, isLoading: loadingFacility } = useFacility();
  const { data: schedules = [] } = useFacilitySchedules();

  const facilityName = facility?.name || "Mi Predio";
  const whatsappUrl = facility?.whatsapp ? `https://wa.me/${facility.whatsapp}` : null;
  const initials = facilityName.charAt(0).toUpperCase();

  const availableSports = sports.filter(s => courts.some(c => c.sport_id === s.id));

  if (loadingFacility) {
      return (
          <PlayerLayout>
              <div className="container px-4 py-10 flex justify-center"><Loader2 className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/></div>
          </PlayerLayout>
      );
  }

  return (
    <PlayerLayout>
      {/* Portada (Hero) */}
      <section className="w-full relative bg-background">
        <div className="w-full h-48 sm:h-72 md:h-80 bg-muted relative overflow-hidden">
            {facility?.cover_url ? (
                <img src={facility.cover_url} alt="Portada del predio" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-muted flex items-center justify-center">
                    <Trophy className="w-20 h-20 text-muted-foreground/20" />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        {/* Logo y Título superpuestos */}
        <div className="container max-w-5xl mx-auto px-4 relative -mt-16 sm:-mt-20 z-10 mb-8 overflow-visible">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-center sm:text-left">
                {/* Contenedor del Logo (Estilo profile pic de Insta/FB) */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-card border-4 border-background overflow-hidden shadow-2xl shrink-0 flex items-center justify-center bg-white p-1">
                    {facility?.logo_url ? (
                        <img src={facility.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                        <img src="/favicon.png" alt="MySportdate" className="w-full h-full object-contain p-3 opacity-90" />
                    )}
                </div>
                <div className="flex-1 pb-2">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight">{facilityName}</h1>
                    {facility?.location && (
                        <p className="text-sm sm:text-base text-muted-foreground font-medium flex items-center justify-center sm:justify-start gap-1.5 mt-2">
                            <MapPin className="w-4 h-4 text-primary" /> {facility.location}
                        </p>
                    )}
                </div>
            </div>
        </div>
      </section>

      {/* SECCIÓN 2: Contenido Principal (Grid de 2 columnas en PC) */}
      <section className="container max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-visible">
            
            {/* COLUMNA IZQUIERDA (Info, Reservas, Servicios) */}
            <div className="lg:col-span-2 space-y-10">
                
                {/* Descripción */}
                {facility?.description && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <h2 className="text-xl font-extrabold flex items-center gap-2.5"><Info className="w-5 h-5 text-primary"/> Sobre nosotros</h2>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line bg-muted rounded-2xl p-6 text-sm sm:text-base border border-border/50">
                            {facility.description}
                        </p>
                    </motion.div>
                )}

                {/* Reservar Cancha */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                    <h2 className="text-xl font-extrabold flex items-center gap-2.5"><Trophy className="w-5 h-5 text-primary"/> Reservá tu cancha</h2>
                    
                    {loadingSports ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[1, 2].map((i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse h-28 border border-border/50" />)}
                        </div>
                    ) : availableSports.length === 0 ? (
                        <div className="text-center py-10 bg-muted rounded-2xl border border-dashed border-border">
                            <p className="text-3xl mb-3">🏟️</p>
                            <p className="text-sm font-semibold text-muted-foreground">Próximamente canchas disponibles</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {availableSports.map((sport, i) => (
                                <motion.button key={sport.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                                    onClick={() => navigate(tp(`/courts/${sport.id}`))}
                                    className="bg-card border border-border shadow-sm rounded-2xl p-6 text-left hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all group flex items-center gap-5"
                                >
                                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform shrink-0">
                                        {sport.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-extrabold text-lg text-foreground group-hover:text-primary transition-colors">{sport.name}</h3>
                                        <p className="text-sm text-muted-foreground font-medium flex items-center gap-1 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                            Ver disponibilidad <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                                        </p>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* --- BANNER DE EVENTOS (Solo visible si el predio lo habilitó) --- */}
                {facility?.has_events && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.98 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        transition={{ delay: 0.15 }} 
                        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-primary p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20 border border-primary/20"
                    >
                        {/* Decoración de fondo */}
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10 pointer-events-none">
                            <PartyPopper className="w-64 h-64 rotate-12" />
                        </div>
                        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 opacity-10 pointer-events-none">
                            <Star className="w-40 h-40 -rotate-12" />
                        </div>

                        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            {/* Ícono llamativo */}
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner border border-white/30">
                                <PartyPopper className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </div>

                            {/* Textos y Botón */}
                            <div className="flex-1 text-center sm:text-left">
                                <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white">¿Festejás tu Cumpleaños?</h2>
                                <p className="text-primary-foreground/90 font-medium mb-5 text-sm sm:text-base max-w-md mx-auto sm:mx-0">
                                    Alquilá nuestras instalaciones de forma exclusiva. 
                                    {facility.default_event_includes ? ` Incluye: ${facility.default_event_includes}.` : " Organizá un evento inolvidable con nosotros."}
                                </p>
                                
                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    <button 
                                        onClick={() => navigate(tp('/events'))} // Asumimos que crearemos una ruta /events
                                        className="bg-white text-primary px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 w-full sm:w-auto justify-center"
                                    >
                                        Ver disponibilidad y precios <ChevronRight className="w-4 h-4" />
                                    </button>
                                    
                                    <span className="text-xs font-semibold text-white/80 bg-black/10 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
                                        Mínimo {facility.default_event_duration / 60} horas
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
                {/* --- FIN BANNER EVENTOS --- */}

                {/* NUEVOS Servicios (Amenities) Visuales */}
                {facility?.amenities && facility.amenities.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-5">
                        <h2 className="text-xl font-extrabold flex items-center gap-2.5"><Star className="w-5 h-5 text-primary"/> Servicios del club</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {facility.amenities.map((amenity, i) => {
                                const Icon = getAmenityIcon(amenity);
                                return (
                                    <div key={i} className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-muted border border-border/50 text-center transition-colors hover:border-primary/20 hover:bg-muted/80">
                                        <div className="w-10 h-10 rounded-xl bg-background border border-border/70 flex items-center justify-center shadow-inner">
                                            <Icon className="w-5 h-5 text-primary" />
                                        </div>
                                        <span className="text-xs font-semibold text-foreground tracking-tight leading-tight line-clamp-2">
                                            {amenity}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

            </div>

            {/* COLUMNA DERECHA (Horarios y Contacto) */}
            <div className="space-y-6">
                
                {/* Tarjeta de Horarios */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-6 shadow-sm border border-border/50">
                    <h3 className="font-bold text-base mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Horarios de atención</h3>
                    <div className="space-y-2.5">
                        {DAYS.map((day, idx) => {
                            const sched = schedules.find((s) => s.day_of_week === idx);
                            const todayIdx = (new Date().getDay() + 6) % 7; // Convertimos Domingo (0) a índice 6
                            const isToday = idx === todayIdx;

                            return (
                                <div key={idx} className={cn("flex justify-between items-center text-sm", isToday ? "font-bold text-primary" : "text-muted-foreground")}>
                                    <span>{day} {isToday && "(Hoy)"}</span>
                                    <span className={cn(isToday && "bg-primary/10 px-2 py-0.5 rounded")}>
                                        {sched?.is_open ? `${sched.open_time.slice(0,5)} - ${sched.close_time.slice(0,5)}` : "Cerrado"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Tarjeta de Contacto y Ubicación */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-2xl p-6 shadow-sm border border-border/50">
                    <h3 className="font-bold text-base mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Contacto y Ubicación</h3>
                    
                    <div className="space-y-3.5 mb-6">
                        {facility?.phone && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><Phone className="w-4 h-4 text-foreground" /></div>
                                <a href={`tel:${facility.phone}`} className="hover:text-primary font-medium transition-colors">{facility.phone}</a>
                            </div>
                        )}
                        {facility?.email && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-foreground" /></div>
                                <a href={`mailto:${facility.email}`} className="hover:text-primary font-medium transition-colors truncate">{facility.email}</a>
                            </div>
                        )}
                        {facility?.instagram_url && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><Instagram className="w-4 h-4 text-foreground" /></div>
                                <a href={facility.instagram_url.startsWith('http') ? facility.instagram_url : `https://instagram.com/${facility.instagram_url.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary font-medium transition-colors">
                                    {facility.instagram_url}
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {whatsappUrl && (
                            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-[#20bd5a] transition-colors shadow-sm hover:shadow">
                                <MessageCircle className="w-5 h-5" /> Contactar por WhatsApp
                            </a>
                        )}
                        
                        {facility?.maps_url && (
                            <a href={facility.maps_url} target="_blank" rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity border border-border/50">
                                <Map className="w-4 h-4" /> Ver en Google Maps
                            </a>
                        )}
                    </div>
                </motion.div>

            </div>

        </div>
      </section>
    </PlayerLayout>
  );
};

export default Index;