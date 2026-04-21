import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, getDay, addDays, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import PlayerLayout from "@/components/layout/PlayerLayout";
import { useFacility, useCourts, useFacilitySchedules, useHolidays, useBookings, useCreateBooking } from "@/hooks/use-supabase-data";
import { useTenantPath } from "@/hooks/use-tenant";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { PartyPopper, CalendarCheck, Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, CreditCard, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const Events = () => {
    const navigate = useNavigate();
    const tp = useTenantPath();
    const today = startOfDay(new Date());
    
    const [selectedDate, setSelectedDate] = useState<Date>(today);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [selectedCourtId, setSelectedCourtId] = useState<string>("");
    const [selectedTime, setSelectedTime] = useState<string>("");
    const [selectedDuration, setSelectedDuration] = useState<number>(0); // Horas elegidas por el cliente
    
    const [formData, setFormData] = useState({ name: "", phone: "", email: "" });

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const { data: facility, isLoading: loadingFac } = useFacility();
    const { data: courts = [] } = useCourts();
    const { data: schedules = [] } = useFacilitySchedules();
    const { data: holidays = [] } = useHolidays();
    const { data: bookings = [] } = useBookings(dateStr);
    const createBooking = useCreateBooking();

    // 1. Filtramos solo las canchas que son EVENTOS
    const eventCourts = courts.filter(c => c.is_event);

    useMemo(() => {
        if (eventCourts.length > 0 && !selectedCourtId) {
            setSelectedCourtId(eventCourts[0].id);
        }
    }, [eventCourts, selectedCourtId]);

    const activeCourt = eventCourts.find(c => c.id === selectedCourtId);
    
    // Variables base configuradas por el Admin
    const minDurationHours = (activeCourt?.duration_minutes || facility?.default_event_duration || 180) / 60;
    const pricePerHour = activeCourt?.price_per_hour || facility?.default_event_price || 0;
    
    // Si el cliente no eligió duración aún (o cambió de cancha), le seteamos el mínimo obligatorio
    useEffect(() => {
        if (selectedDuration < minDurationHours) {
            setSelectedDuration(minDurationHours);
        }
    }, [minDurationHours, selectedCourtId]);

    const totalPrice = pricePerHour * selectedDuration;

    // 2. Lógica de Horarios EXCLUSIVA para Eventos
    const todayHoliday = holidays.find(h => h.date === dateStr);
    
    // Calculamos el índice del día (Lunes = 0, Domingo = 6) para leer la agenda regular
    const jsDay = getDay(selectedDate); 
    const dayIdx = jsDay === 0 ? 6 : jsDay - 1; 
    const todaySchedule = schedules.find((s) => s.day_of_week === dayIdx);

    let isClosed = false;
    let openH = -1;
    let closeH = -1;

    if (todayHoliday) {
        isClosed = todayHoliday.is_closed;
        if (!isClosed) {
            openH = parseInt(todayHoliday.custom_open_time?.split(":")[0] || "12");
            closeH = parseInt(todayHoliday.custom_close_time?.split(":")[0] || "23");
        }
    } else {
        // PRIMERO revisamos si el día de la semana está cerrado en la configuración general
        isClosed = todaySchedule ? !todaySchedule.is_open : false;
        
        // SI ESTÁ ABIERTO, le aplicamos los horarios específicos de eventos
        if (!isClosed) {
            const eventOpen = facility?.event_open_time || "12:00";
            const eventClose = facility?.event_close_time || "23:00";
            openH = parseInt(eventOpen.split(":")[0]);
            closeH = parseInt(eventClose.split(":")[0]);
        }
    }

    if (closeH <= openH && closeH >= 0) closeH += 24;

    // 3. Generar bloques de horarios disponibles (Respetando la duración elegida por el cliente)
    const availableSlots = useMemo(() => {
        if (isClosed || !activeCourt) return [];
        const slots: string[] = [];
        
        for (let h = openH; h <= closeH - selectedDuration; h++) {
            const timeString = `${(h % 24).toString().padStart(2, "0")}:00`;
            
            const isOverlap = bookings.some(b => {
                const bookingCourt = courts.find(c => c.id === b.court_id);
                if (!bookingCourt) return false;

                // 1. ¿Es exactamente la misma cancha/paquete?
                const isDirectMatch = bookingCourt.shared_group_id === activeCourt.shared_group_id;
                
                // 2. ¿El paquete de evento que queremos reservar incluye la cancha que ya está ocupada?
                const eventBlocksBookedCourt = activeCourt.linked_court_ids?.includes(bookingCourt.shared_group_id!);
                
                // 3. ¿La reserva existente es un evento gigante que ya bloqueó la cancha que queremos reservar?
                const bookedCourtBlocksEvent = bookingCourt.linked_court_ids?.includes(activeCourt.shared_group_id!);

                // Si no hay ninguna relación física entre las reservas, no hay choque
                if (!isDirectMatch && !eventBlocksBookedCourt && !bookedCourtBlocksEvent) return false;

                // Si comparten espacio físico, verificamos si chocan en el HORARIO:
                const bStart = new Date(b.start_time).getHours();
                const bEnd = new Date(b.end_time).getHours();
                const bEndAdjusted = bEnd <= bStart ? bEnd + 24 : bEnd; 

                const eStart = h;
                const eEnd = h + selectedDuration; // Duración elegida por el cliente

                // Lógica matemática de superposición de rangos de tiempo
                return Math.max(bStart, eStart) < Math.min(bEndAdjusted, eEnd);
            });

            if (!isOverlap) slots.push(timeString);
        }
        return slots;
    }, [isClosed, activeCourt, openH, closeH, selectedDuration, bookings, courts]);

    // Calcular cuántas horas máximo puede elegir si ya seleccionó un horario de inicio
    const maxAllowedHours = useMemo(() => {
        if (!selectedTime) return 12; // Un límite lógico de 12 horas si no seleccionó hora
        
        const startH = parseInt(selectedTime.split(":")[0]);
        const startHAdjusted = startH < openH ? startH + 24 : startH; // Ajuste si arranca después de las 00:00
        
        // El máximo es la hora de cierre del predio menos la hora a la que arranca
        return closeH - startHAdjusted;
    }, [selectedTime, closeH, openH]);

    // Opciones para el select de duración (Ej: 3hs, 4hs, 5hs)
    const durationOptions = Array.from({ length: 12 }, (_, i) => i + 1)
                                 .filter(h => h >= minDurationHours);


    const handleBooking = async () => {
        if (!selectedTime || !formData.name || !formData.phone || !formData.email || !activeCourt) {
            toast({ title: "Faltan datos", description: "Completá todos los campos obligatorios.", variant: "destructive" });
            return;
        }
        if (!formData.email.includes("@")) {
            toast({ title: "Email inválido", description: "Por favor ingresá un correo válido.", variant: "destructive" });
            return;
        }

        const durationMins = selectedDuration * 60;

        if (facility?.requires_deposit) {
            const depositAmount = (totalPrice * (facility.deposit_percentage || 50)) / 100;
            navigate(tp('/checkout'), {
                state: {
                    courtId: activeCourt.id,
                    date: dateStr,
                    time: selectedTime,
                    duration: durationMins,
                    price: totalPrice,
                    deposit: depositAmount,
                    isEvent: true, 
                    userData: formData
                }
            });
            return;
        }

        try {
            const startDateTime = new Date(`${dateStr}T${selectedTime}:00`);
            const endDateTime = new Date(startDateTime.getTime() + durationMins * 60000);

            await createBooking.mutateAsync({
                court_id: activeCourt.id,
                date: dateStr,
                time: selectedTime,
                user_name: formData.name,
                user_email: formData.email,
                user_phone: formData.phone,
                total_price: totalPrice,
                deposit_amount: 0, 
                payment_status: "none",
                booking_type: "online",
                end_time: endDateTime.toISOString()
            } as any);

            toast({ title: "¡Evento reservado! 🎉", description: "Nos pondremos en contacto con vos para confirmar los detalles." });
            navigate(tp('/')); 
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    if (loadingFac) return <div className="p-20 text-center">Cargando...</div>;

    if (!facility?.has_events || eventCourts.length === 0) {
        return (
            <PlayerLayout>
                <div className="container px-4 py-20 text-center">
                    <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h2 className="text-2xl font-bold">Servicio no disponible</h2>
                    <p className="text-muted-foreground mt-2">Por el momento no estamos tomando reservas online para eventos.</p>
                    <button onClick={() => navigate(tp('/'))} className="mt-6 text-primary font-bold hover:underline">Volver al inicio</button>
                </div>
            </PlayerLayout>
        );
    }

    let stepNumber = 1;

    return (
        <PlayerLayout>
            <div className="bg-primary/5 border-b border-primary/10">
                <div className="container max-w-4xl mx-auto px-4 py-8 sm:py-12">
                    <button onClick={() => navigate(tp('/'))} className="flex items-center gap-1 text-sm font-bold text-primary mb-4 hover:underline">
                        <ChevronLeft className="w-4 h-4"/> Volver
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-primary text-primary-foreground rounded-xl"><PartyPopper className="w-6 h-6"/></div>
                        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">Tu Evento</h1>
                    </div>
                    <p className="text-muted-foreground max-w-xl">
                        Elegí la fecha, verificá la disponibilidad y asegurá tu lugar para un festejo inolvidable.
                        {facility.default_event_includes && <span className="block mt-2 font-medium text-foreground text-sm">✨ Incluye: {facility.default_event_includes}</span>}
                    </p>
                </div>
            </div>

            <div className="container max-w-4xl mx-auto px-4 py-8 pb-24 grid grid-cols-1 md:grid-cols-12 gap-8">
                
                <div className="md:col-span-7 space-y-8">
                    
                    {eventCourts.length > 1 && (
                        <div className="space-y-3">
                            <h3 className="font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">{stepNumber++}</span> Elegí el salón/cancha</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {eventCourts.map(c => (
                                    <button 
                                        key={c.id} 
                                        onClick={() => { setSelectedCourtId(c.id); setSelectedTime(""); }} 
                                        className={cn("p-4 rounded-xl border-2 text-left transition-all", selectedCourtId === c.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 bg-card")}
                                    >
                                        <p className="font-bold text-foreground">{c.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">${c.price_per_hour}/hora base</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <h3 className="font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">{stepNumber++}</span> Elegí el día</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setSelectedDate(addDays(selectedDate, -1)); setSelectedTime(""); }} disabled={isBefore(addDays(selectedDate, -1), today)} className="p-3 bg-muted rounded-xl hover:bg-muted/80 disabled:opacity-50 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <button onClick={() => setCalendarOpen(true)} className="flex-1 bg-card border-2 border-border/50 rounded-xl p-3 font-bold flex justify-center items-center gap-2 hover:border-primary/50 transition-colors">
                                        <CalendarCheck className="w-5 h-5 text-primary" /> {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 z-[60]" align="center">
                                    <Calendar mode="single" selected={selectedDate} onSelect={(d) => { if(d) { setSelectedDate(d); setCalendarOpen(false); setSelectedTime(""); } }} disabled={(date) => isBefore(date, today)} initialFocus locale={es}/>
                                </PopoverContent>
                            </Popover>
                            <button onClick={() => { setSelectedDate(addDays(selectedDate, 1)); setSelectedTime(""); }} className="p-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors"><ChevronRight className="w-5 h-5"/></button>
                        </div>
                        {todayHoliday && (
                            <p className="text-xs font-bold text-orange-600 bg-orange-500/10 p-2 rounded-lg inline-block mt-2">
                                ⭐ Horario Especial por Feriado: {todayHoliday.label}
                            </p>
                        )}
                    </div>

                    {/* NUEVO PASO: Duración Dinámica */}
                    <div className="space-y-3">
                        <h3 className="font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">{stepNumber++}</span> ¿Cuánto tiempo dura?</h3>
                        <Select 
                            value={selectedDuration.toString()} 
                            onValueChange={(val) => {
                                const newDur = Number(val);
                                setSelectedDuration(newDur);
                                // Si con la nueva duración se pasa de la hora de cierre, reseteamos la hora elegida
                                if (selectedTime) {
                                    const startH = parseInt(selectedTime.split(":")[0]);
                                    const startHAdjusted = startH < openH ? startH + 24 : startH;
                                    if (startHAdjusted + newDur > closeH) {
                                        setSelectedTime("");
                                        toast({ title: "Horario reseteado", description: "La nueva duración excede el horario de cierre. Elegí la hora de inicio nuevamente." });
                                    }
                                }
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[300px] h-14 border-2 border-border/50 rounded-xl px-4 font-bold bg-card focus:border-primary">
                                <Timer className="w-4 h-4 text-muted-foreground mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {durationOptions.map(h => (
                                    <SelectItem key={h} value={h.toString()} className="font-bold">
                                        {h} horas {h === minDurationHours ? "(Mínimo)" : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">{stepNumber++}</span> Hora de inicio</h3>
                        </div>
                        
                        {isClosed ? (
                            <div className="p-6 bg-destructive/10 text-destructive text-center rounded-xl border border-destructive/20 font-bold flex flex-col items-center gap-2">
                                <AlertCircle className="w-6 h-6" /> El predio se encuentra cerrado este día.
                            </div>
                        ) : availableSlots.length === 0 ? (
                            <div className="p-6 bg-muted/50 text-muted-foreground text-center rounded-xl border border-dashed border-border font-medium">
                                No hay horarios disponibles para un evento de {selectedDuration} horas. Probá achicando la duración.
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {availableSlots.map(time => (
                                    <button key={time} onClick={() => setSelectedTime(time)}
                                        className={cn("py-3 rounded-xl border-2 text-sm font-bold transition-all", selectedTime === time ? "bg-primary border-primary text-primary-foreground shadow-md scale-105" : "bg-card border-border hover:border-primary/40")}>
                                        {time}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedTime && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h3 className="font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">{stepNumber++}</span> Tus Datos</h3>
                            <div className="bg-card border-2 border-border/50 rounded-xl p-5 space-y-4 shadow-sm">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground block mb-1">Nombre Completo *</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary font-medium" placeholder="Ej: Lionel Messi" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1">Teléfono *</label>
                                        <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary font-medium" placeholder="1123456789" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1">Email *</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary font-medium" placeholder="lio@ejemplo.com" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="md:col-span-5">
                    <div className="sticky top-24 bg-card border-2 border-primary/20 rounded-3xl p-6 shadow-xl shadow-primary/5">
                        <h3 className="font-extrabold text-xl mb-4 border-b border-border pb-4">Resumen</h3>
                        
                        <div className="space-y-4 mb-6">
                            {eventCourts.length > 1 && (
                                <div className="flex items-start justify-between">
                                    <p className="text-muted-foreground text-sm font-medium">Espacio</p>
                                    <p className="font-bold text-right">{activeCourt?.name}</p>
                                </div>
                            )}
                            <div className="flex items-start justify-between">
                                <p className="text-muted-foreground text-sm font-medium">Fecha</p>
                                <p className="font-bold text-right capitalize">{format(selectedDate, "EEEE d 'de' MMM", { locale: es })}</p>
                            </div>
                            <div className="flex items-start justify-between">
                                <p className="text-muted-foreground text-sm font-medium">Horario</p>
                                <p className="font-bold text-right text-primary">
                                    {selectedTime ? `${selectedTime} a ${(parseInt(selectedTime.split(':')[0]) + selectedDuration) % 24 === 0 ? "00" : ((parseInt(selectedTime.split(':')[0]) + selectedDuration) % 24).toString().padStart(2, "0")}:00 hs` : "---"}
                                </p>
                            </div>
                            <div className="flex items-start justify-between">
                                <p className="text-muted-foreground text-sm font-medium">Duración</p>
                                <p className="font-bold text-right">{selectedDuration} horas</p>
                            </div>
                            
                            <div className="pt-4 border-t border-border border-dashed flex items-center justify-between">
                                <p className="font-bold">Total a pagar</p>
                                <p className="text-2xl font-black text-primary">${totalPrice.toLocaleString()}</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleBooking}
                            disabled={!selectedTime || createBooking.isPending}
                            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {createBooking.isPending ? "Procesando..." : facility?.requires_deposit ? <><CreditCard className="w-5 h-5"/> Continuar al Pago</> : <><CheckCircle2 className="w-5 h-5"/> Confirmar Evento</>}
                        </button>
                        
                        {facility?.requires_deposit && (
                            <p className="text-center text-[10px] text-muted-foreground mt-3 font-semibold">
                                Se requiere una seña de ${(totalPrice * (facility.deposit_percentage || 50) / 100).toLocaleString()} ({facility.deposit_percentage}%) para confirmar.
                            </p>
                        )}
                    </div>
                </div>

            </div>
        </PlayerLayout>
    );
};

export default Events;