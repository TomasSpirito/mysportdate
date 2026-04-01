import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, addDays, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { useCourt, useBookingsByCourt, generateAvailableSlots, useFacilitySchedulesByFacilityId } from "@/hooks/use-supabase-data";
import { useTenantPath } from "@/hooks/use-tenant";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Trophy } from "lucide-react"; // <-- Agregamos Trophy

const BookingCalendar = () => {
  const { courtId } = useParams();
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { data: court, isLoading: loadingCourt } = useCourt(courtId);
  const { data: schedules = [] } = useFacilitySchedulesByFacilityId(court?.facility_id);

  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: bookings = [] } = useBookingsByCourt(courtId, dateStr);

  const jsDay = getDay(selectedDate); 
  const dayIdx = jsDay === 0 ? 6 : jsDay - 1; 
  const daySchedule = schedules.find((s) => s.day_of_week === dayIdx);
  const isDayClosed = daySchedule ? !daySchedule.is_open : false;

  const isDateClosed = (date: Date) => {
    const js = getDay(date);
    const idx = js === 0 ? 6 : js - 1;
    const sched = schedules.find((s) => s.day_of_week === idx);
    return sched ? !sched.is_open : false;
  };

  const openHour = daySchedule?.is_open ? parseInt(daySchedule.open_time.split(":")[0]) : 8;
  let closeHour = daySchedule?.is_open ? parseInt(daySchedule.close_time.split(":")[0]) : 23;

  if (closeHour <= openHour && closeHour >= 0) {
    closeHour += 24;
  }

  const slots = useMemo(() => generateAvailableSlots(bookings, dateStr, openHour, closeHour), [bookings, dateStr, openHour, closeHour]);
  
  const availableSlots = useMemo(() => {
    const now = new Date();
    // Verificamos si la fecha seleccionada es exactamente el día de hoy
    const isToday = format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
    const currentHour = now.getHours();

    return slots.filter((s) => {
      // 1. Si ya está reservada en la base de datos, la ocultamos
      if (!s.available) return false;
      
      // 2. Si es hoy, bloqueamos los horarios que ya pasaron (y la hora actual)
      if (isToday) {
        const slotHour = parseInt(s.time.split(":")[0]);
        // Solo mostramos si la hora del turno es estrictamente MAYOR a la hora actual
        return slotHour > currentHour;
      }
      
      // Si es mañana o cualquier otro día futuro, mostramos todo
      return true;
    });
  }, [slots, selectedDate]);

  if (loadingCourt) return <PlayerLayout><div className="container py-10 text-center text-muted-foreground">Cargando...</div></PlayerLayout>;
  if (!court) return null;

  const handleConfirm = () => {
    if (!selectedTime) return;
    const params = new URLSearchParams({ court: courtId!, date: dateStr, time: selectedTime });
    navigate(tp(`/checkout?${params.toString()}`));
  };

  return (
    <PlayerLayout showBack backTo={tp(`/courts/${court.sport_id}`)} title="Reservar">
      {/* MEJORA 1: Imagen "Hero" tipo portada. Se expande a los bordes en mobile y se redondea en desktop */}
      <div className="relative w-full h-48 sm:h-64 bg-muted mb-6 sm:rounded-b-3xl sm:max-w-4xl sm:mx-auto overflow-hidden shadow-sm">
          {court.image_url ? (
              <img src={court.image_url} alt={court.name} className="w-full h-full object-cover" />
          ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-muted flex items-center justify-center">
                  <Trophy className="w-16 h-16 text-muted-foreground/30" />
              </div>
          )}
          {/* Degradado oscuro para que el texto blanco resalte siempre */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 sm:left-8 sm:bottom-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground drop-shadow-sm">{court.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold border border-primary/20">
                      ${court.price_per_hour.toLocaleString()}/hora
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">{court.surface}</span>
              </div>
          </div>
      </div>

      {/* MEJORA 2: Agregamos pb-32 (padding-bottom) para que el botón flotante no tape los últimos horarios */}
      <div className="container px-4 pb-32 max-w-4xl mx-auto">
        {/* Date selector */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold">Elegí una fecha</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto py-3 -mx-4 px-4 scrollbar-hide">
            {dates.map((date) => {
              const isSelected = format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
              const closed = isDateClosed(date);
              return (
                <button key={date.toISOString()}
                  onClick={() => { if (!closed) { setSelectedDate(date); setSelectedTime(null); } }}
                  disabled={closed}
                  className={cn("flex flex-col items-center min-w-[64px] py-3 px-2 rounded-2xl text-xs font-medium transition-all shrink-0 border-2",
                    closed ? "bg-muted/30 border-transparent opacity-40 cursor-not-allowed" :
                    isSelected ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105 transform origin-bottom" : "bg-card border-transparent shadow-sm hover:border-primary/30")}
                >
                  <span className={cn("uppercase text-[10px] font-bold mb-1", isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>
                    {format(date, "EEE", { locale: es })}
                  </span>
                  <span className="text-xl font-extrabold leading-none">{format(date, "d")}</span>
                  <span className={cn("text-[10px] mt-1 font-semibold", isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>
                    {closed ? "Cerrado" : format(date, "MMM", { locale: es })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold">Horarios disponibles</span>
            {!isDayClosed && <span className="ml-auto bg-muted px-2.5 py-1 rounded-full text-xs font-bold text-muted-foreground">{availableSlots.length} libres</span>}
          </div>
          
          {isDayClosed ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 rounded-3xl bg-muted/30 border border-border border-dashed">
              <p className="text-4xl mb-3">🌙</p>
              <p className="font-bold text-base">Cerrado este día</p>
              <p className="text-sm text-muted-foreground mt-1">Elegí otra fecha en el calendario</p>
            </motion.div>
          ) : availableSlots.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 rounded-3xl bg-muted/30 border border-border border-dashed">
              <p className="text-4xl mb-3">⏳</p>
              <p className="font-bold text-base">Cancha llena</p>
              <p className="text-sm text-muted-foreground mt-1">Ya no quedan turnos disponibles hoy</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {availableSlots.map((slot, i) => (
                <motion.button key={slot.time} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                  onClick={() => setSelectedTime(slot.time)}
                  className={cn("py-3.5 px-2 rounded-2xl text-sm font-bold transition-all border-2",
                    selectedTime === slot.time ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" : "bg-card border-border/50 text-foreground hover:border-primary/50 hover:shadow-sm")}
                >
                  {slot.time}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Confirm button */}
        {selectedTime && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-0 left-0 right-0 p-4 sm:p-5 bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-30">
            <div className="container max-w-4xl mx-auto flex items-center justify-between gap-4">
              
              {/* Lado izquierdo: Fecha y Hora */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground capitalize truncate">
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-foreground">
                    <Clock className="w-4 h-4" />
                    <p className="text-xl font-extrabold">{selectedTime} hs</p>
                </div>
              </div>

              {/* Lado derecho: Precio y Botón */}
              <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Total</p>
                    <p className="text-xl sm:text-2xl font-black text-primary leading-none">${court.price_per_hour.toLocaleString()}</p>
                </div>
                
                <button onClick={handleConfirm} className="bg-primary text-primary-foreground px-6 sm:px-8 py-3.5 rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
                  Reservar
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </div>
    </PlayerLayout>
  );
};

export default BookingCalendar;