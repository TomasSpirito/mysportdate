import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { courts, generateTimeSlots } from "@/data/mock-data";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { cn } from "@/lib/utils";
import { Calendar, Clock } from "lucide-react";

const BookingCalendar = () => {
  const { courtId } = useParams();
  const navigate = useNavigate();
  const court = courts.find((c) => c.id === courtId);

  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const slots = useMemo(() => generateTimeSlots(courtId || "", dateStr), [courtId, dateStr]);
  const availableSlots = slots.filter((s) => s.available);

  if (!court) return null;

  const handleConfirm = () => {
    if (!selectedTime) return;
    const params = new URLSearchParams({
      court: courtId!,
      date: dateStr,
      time: selectedTime,
    });
    navigate(`/checkout?${params.toString()}`);
  };

  return (
    <PlayerLayout showBack backTo={`/courts/${court.sportId}`} title={court.name}>
      <div className="container py-6">
        <h2 className="text-xl font-extrabold mb-1">{court.name}</h2>
        <p className="text-sm text-muted-foreground mb-5">${court.pricePerHour.toLocaleString()}/hora • {court.surface}</p>

        {/* Date selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Elegí una fecha</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {dates.map((date) => {
              const isSelected = format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                  className={cn(
                    "flex flex-col items-center min-w-[60px] py-2.5 px-3 rounded-xl text-xs font-medium transition-all border",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card border-border hover:border-primary/50"
                  )}
                >
                  <span className="uppercase text-[10px] opacity-70">{format(date, "EEE", { locale: es })}</span>
                  <span className="text-lg font-bold">{format(date, "d")}</span>
                  <span className="text-[10px] opacity-70">{format(date, "MMM", { locale: es })}</span>
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
            <span className="ml-auto text-xs text-muted-foreground">{availableSlots.length} libres</span>
          </div>

          {availableSlots.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 rounded-2xl bg-muted/50">
              <p className="text-4xl mb-2">😕</p>
              <p className="font-semibold text-sm">No hay turnos disponibles</p>
              <p className="text-xs text-muted-foreground mt-1">Probá otra fecha u otra cancha</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map((slot, i) => (
                <motion.button
                  key={slot.time}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedTime(slot.time)}
                  className={cn(
                    "py-3 px-2 rounded-xl text-sm font-bold transition-all border",
                    selectedTime === slot.time
                      ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                      : "bg-card border-border hover:border-primary/50 hover:shadow-md"
                  )}
                >
                  {slot.time}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Confirm button */}
        {selectedTime && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border">
            <div className="container flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</p>
                <p className="font-bold">{selectedTime} hs • ${court.pricePerHour.toLocaleString()}</p>
              </div>
              <button onClick={handleConfirm} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
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
