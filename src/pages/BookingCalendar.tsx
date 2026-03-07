import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, addDays, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { useCourt, useBookingsByCourt, generateAvailableSlots, useFacilitySchedulesByFacilityId } from "@/hooks/use-supabase-data";
import { useTenantPath } from "@/hooks/use-tenant";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { cn } from "@/lib/utils";
import { Calendar, Clock } from "lucide-react";

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

  // Get schedule for the selected date's day of week (0=Mon...6=Sun)
  const jsDay = getDay(selectedDate); // 0=Sun,1=Mon,...6=Sat
  const dayIdx = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon,...6=Sun
  const daySchedule = schedules.find((s) => s.day_of_week === dayIdx);
  const isDayClosed = daySchedule ? !daySchedule.is_open : false;

  // Check if a date is closed
  const isDateClosed = (date: Date) => {
    const js = getDay(date);
    const idx = js === 0 ? 6 : js - 1;
    const sched = schedules.find((s) => s.day_of_week === idx);
    return sched ? !sched.is_open : false;
  };

  // Dynamic open/close hours
  const openHour = daySchedule?.is_open ? parseInt(daySchedule.open_time.split(":")[0]) : 8;
  let closeHour = daySchedule?.is_open ? parseInt(daySchedule.close_time.split(":")[0]) : 23;

  // EL FIX PARA LA MEDIANOCHE LADO CLIENTE:
  if (closeHour === 0) closeHour = 24;

  const slots = useMemo(() => generateAvailableSlots(bookings, dateStr, openHour, closeHour), [bookings, dateStr, openHour, closeHour]);
  const availableSlots = slots.filter((s) => s.available);

  if (loadingCourt) return <PlayerLayout><div className="container py-10 text-center text-muted-foreground">Cargando...</div></PlayerLayout>;
  if (!court) return null;

  const handleConfirm = () => {
    if (!selectedTime) return;
    const params = new URLSearchParams({ court: courtId!, date: dateStr, time: selectedTime });
    navigate(tp(`/checkout?${params.toString()}`));
  };

  return (
    <PlayerLayout showBack backTo={tp(`/courts/${court.sport_id}`)} title={court.name}>
      <div className="container px-4 py-6">
        <h2 className="text-xl font-extrabold mb-1">{court.name}</h2>
        <p className="text-sm text-muted-foreground mb-5">${court.price_per_hour.toLocaleString()}/hora • {court.surface}</p>

        {/* Date selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Elegí una fecha</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {dates.map((date) => {
              const isSelected = format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
              const closed = isDateClosed(date);
              return (
                <button key={date.toISOString()}
                  onClick={() => { if (!closed) { setSelectedDate(date); setSelectedTime(null); } }}
                  disabled={closed}
                  className={cn("flex flex-col items-center min-w-[60px] py-2.5 px-3 rounded-xl text-xs font-medium transition-all border shrink-0",
                    closed ? "bg-muted/50 border-border opacity-40 cursor-not-allowed line-through" :
                    isSelected ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card border-border hover:border-primary/50")}>
                  <span className="uppercase text-[10px] opacity-70">{format(date, "EEE", { locale: es })}</span>
                  <span className="text-lg font-bold">{format(date, "d")}</span>
                  <span className="text-[10px] opacity-70">{closed ? "Cerrado" : format(date, "MMM", { locale: es })}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Horarios disponibles</span>
            {!isDayClosed && <span className="ml-auto text-xs text-muted-foreground">{availableSlots.length} libres</span>}
          </div>
          {isDayClosed ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 rounded-2xl bg-muted/50">
              <p className="text-4xl mb-2">🚫</p>
              <p className="font-semibold text-sm">Cerrado este día</p>
              <p className="text-xs text-muted-foreground mt-1">Elegí otra fecha para reservar</p>
            </motion.div>
          ) : availableSlots.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 rounded-2xl bg-muted/50">
              <p className="text-4xl mb-2">😕</p>
              <p className="font-semibold text-sm">No hay turnos disponibles</p>
              <p className="text-xs text-muted-foreground mt-1">Probá otra fecha u otra cancha</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map((slot, i) => (
                <motion.button key={slot.time} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedTime(slot.time)}
                  className={cn("py-3 px-2 rounded-xl text-sm font-bold transition-all border",
                    selectedTime === slot.time ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" : "bg-card border-border hover:border-primary/50 hover:shadow-md")}>
                  {slot.time}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Confirm button */}
        {selectedTime && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border z-30">
            <div className="container flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</p>
                <p className="font-bold truncate">{selectedTime} hs • ${court.price_per_hour.toLocaleString()}</p>
              </div>
              <button onClick={handleConfirm} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shrink-0">
                Continuar
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </PlayerLayout>
  );
};

export default BookingCalendar;
