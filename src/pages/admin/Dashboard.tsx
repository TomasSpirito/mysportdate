import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useFacility, useCourts, useSports, useBookings, useCancelledBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, useFacilitySchedules, useHolidays, type Booking, type Court } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { format, addDays, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, Phone, Mail, CalendarCheck, AlertCircle, CreditCard, Banknote, SmartphoneNfc } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const typeLabels: Record<string, string> = { online: "Online", fixed: "Fijo", manual: "Manual" };

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo", icon: Banknote, activeClass: "bg-[#00a650]/10 border-[#00a650] text-[#00a650]", hoverClass: "hover:border-[#00a650]/50 hover:bg-[#00a650]/5" },
  { value: "mercadopago", label: "Mercado Pago", icon: SmartphoneNfc, activeClass: "bg-[#009EE3]/10 border-[#009EE3] text-[#009EE3]", hoverClass: "hover:border-[#009EE3]/50 hover:bg-[#009EE3]/5" },
  { value: "tarjeta", label: "Tarjeta", icon: CreditCard, activeClass: "bg-purple-500/10 border-purple-500 text-purple-600", hoverClass: "hover:border-purple-500/50 hover:bg-purple-500/5" },
];

const AdminDashboard = () => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // CORRECCIÓN 1: manualSlot ahora guarda "pc" (la columna entera) en lugar de "courtId"
  const [manualSlot, setManualSlot] = useState<{ pc: any; hour: string } | null>(null);
  
  const [courtFilter, setCourtFilter] = useState<string>("all");

  // CORRECCIÓN 2: Agregamos selectedVirtualCourtId al estado del formulario
  const [manualForm, setManualForm] = useState({ 
      name: "", email: "", phone: "", paymentStatus: "none", paymentMethod: "efectivo", depositAmount: "",
      duration: 60, customPrice: "", startTime: "", selectedVirtualCourtId: "" 
  });
  
  const [collectMethod, setCollectMethod] = useState("efectivo");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("client_excused");
  const [refundStatus, setRefundStatus] = useState("none");
  
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  
  const { data: facility } = useFacility();
  const { data: courts = [] } = useCourts();
  const { data: sports = [] } = useSports();
  const { data: bookings = [] } = useBookings(dateStr);
  const { data: cancelledBookings = [] } = useCancelledBookings(dateStr);
  const { data: schedules = [] } = useFacilitySchedules();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const createBooking = useCreateBooking();

// Traemos los feriados de la base de datos
  const { data: holidays = [] } = useHolidays();
  
  // Verificamos si la fecha actual seleccionada es un feriado
  const todayHoliday = holidays.find(h => h.date === dateStr);

  const jsDay = getDay(selectedDate); 
  const dayIdx = jsDay === 0 ? 6 : jsDay - 1; 
  const todaySchedule = schedules.find((s) => s.day_of_week === dayIdx);
  
  let isClosed = false;
  let openH = -1;
  let closeH = -1;

  if (todayHoliday) {
      // 🚨 MODO FERIADO ACTIVADO
      isClosed = todayHoliday.is_closed;
      if (!isClosed) {
          openH = parseInt(todayHoliday.custom_open_time?.split(":")[0] || "12");
          closeH = parseInt(todayHoliday.custom_close_time?.split(":")[0] || "23");
      }
  } else {
      // 📅 MODO SEMANA NORMAL
      isClosed = todaySchedule ? !todaySchedule.is_open : false;
      if (!isClosed) {
          openH = todaySchedule?.is_open ? parseInt(todaySchedule.open_time.split(":")[0]) : (!todaySchedule ? 8 : -1);
          closeH = todaySchedule?.is_open ? parseInt(todaySchedule.close_time.split(":")[0]) : (!todaySchedule ? 23 : -1);
      }
  }

  // Magia para los horarios que pasan la medianoche (ej: cierra a las 02:00 am)
  if (closeH <= openH && closeH >= 0) closeH += 24;

  const hours: string[] = [];
  if (openH >= 0 && closeH > openH) {
    for (let h = openH; h < closeH; h++) {
      const displayH = h % 24;
      hours.push(`${displayH.toString().padStart(2, "0")}:00`);
    }
  }

  // --- MAGIA DE AGRUPACIÓN FÍSICA ---
  const physicalCourts = courts.reduce((acc, current) => {
      const key = current.shared_group_id || current.id;
      const existing = acc.find(c => c.key === key);
      if (existing) {
          existing.virtualCourts.push(current);
      } else {
          acc.push({ key, name: current.name, virtualCourts: [current] });
      }
      return acc;
  }, [] as { key: string; name: string; virtualCourts: Court[] }[]);

  const visiblePhysicalCourts = courtFilter === "all" ? physicalCourts : physicalCourts.filter(pc => pc.key === courtFilter);

  const getBookingGroup = (courtIds: string[], hour: string) => {
    return bookings.find((b) => {
      if (!courtIds.includes(b.court_id)) return false;

      const start = new Date(b.start_time);
      const end = b.end_time ? new Date(b.end_time) : new Date(start.getTime() + 60 * 60000);
      const slotTime = new Date(selectedDate);
      const [h, m] = hour.split(':');
      slotTime.setHours(parseInt(h), parseInt(m), 0, 0);

      return slotTime >= start && slotTime < end;
    });
  };

  const getSportName = (sportId: string) => sports.find((s) => s.id === sportId)?.name || "Deporte";
  const getCourtName = (courtId: string) => courts.find((c) => c.id === courtId)?.name || "";
  const getCourtPrice = (courtId: string) => courts.find((c) => c.id === courtId)?.price_per_hour || 0;

  const getSlotStyle = (booking?: Booking) => {
    if (!booking) return "bg-slot-free border border-slot-free-border hover:bg-primary/10 cursor-pointer";
    if (booking.booking_type === "fixed") return "bg-info text-info-foreground";
    if (booking.booking_type === "manual" && booking.payment_status !== "full" && booking.payment_status !== "partial") return "bg-destructive text-destructive-foreground border-destructive/50";
    if (booking.payment_status === "full") return "bg-primary text-primary-foreground";
    return "bg-slot-deposit text-slot-deposit-foreground border-orange-500/50";
  };

  const handleCollect = async () => {
    if (!selectedBooking) return;
    await updateBooking.mutateAsync({ 
        id: selectedBooking.id, payment_status: "full", deposit_amount: selectedBooking.total_price, payment_method: collectMethod 
    } as any);
    toast({ title: "Pago registrado en caja ✅" });
    setSelectedBooking(null);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;
    await updateBooking.mutateAsync({ 
        id: selectedBooking.id, status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: cancelReason, refund_status: selectedBooking.deposit_amount > 0 ? refundStatus : "none"
    } as any);
    toast({ title: "Reserva cancelada y cancha liberada" });
    setSelectedBooking(null);
    setIsCancelling(false);
  };

  const getRequiredDeposit = (priceNum: number) => {
      if (!facility?.requires_deposit) return 0;
      const percentage = facility.deposit_percentage || 50;
      return (priceNum * percentage) / 100;
  };

  const handleSlotClick = (pc: any, hour: string) => {
    setIsCancelling(false);
    const courtIds = pc.virtualCourts.map((c: Court) => c.id);
    const booking = getBookingGroup(courtIds, hour);
    
    if (booking) {
      setSelectedBooking(booking);
      setCollectMethod(booking.payment_method || "efectivo");
    } else {
      setManualSlot({ pc, hour });
      
      // Buscamos la primera variante que NO sea evento para ponerla por defecto.
      // Si por alguna razón la cancha es SÓLO para eventos (raro, pero posible), agarra la primera.
      const firstVariant = pc.virtualCourts.find((c: Court) => !c.is_event) || pc.virtualCourts[0];
      
      // Asegurarnos de calcular bien la duración y el precio inicial
      const initialDuration = firstVariant.is_event ? (firstVariant.duration_minutes || 180) : 60;
      const initialPrice = firstVariant.price_per_hour * (initialDuration / 60);

      setManualForm({ 
          name: "", email: "", phone: "", paymentStatus: "none", paymentMethod: "efectivo", depositAmount: "",
          duration: initialDuration, 
          customPrice: initialPrice.toString(), 
          startTime: hour,
          selectedVirtualCourtId: firstVariant.id
      });
    }
  };

  const handleCreateManual = async () => {
    const nameStr = manualForm.name.trim();
    const emailStr = manualForm.email.trim();
    const phoneStr = manualForm.phone.trim();

    // El slot y el nombre SIEMPRE son obligatorios
    if (!manualSlot || !nameStr) {
      toast({ title: "Atención", description: "El nombre del jugador es obligatorio.", variant: "destructive" });
      return;
    }

    // Validar Email solo si está configurado como obligatorio (o si el usuario escribió algo, lo validamos)
    if (facility?.require_email_manual && !emailStr) {
      toast({ title: "Atención", description: "El email es obligatorio según tu configuración.", variant: "destructive" });
      return;
    }
    if (emailStr) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        toast({ title: "Email inválido", description: "Por favor ingresá un correo electrónico real.", variant: "destructive" });
        return;
      }
    }

    // Validar Teléfono solo si está configurado como obligatorio (o si el usuario escribió algo, lo validamos)
    if (facility?.require_phone_manual && !phoneStr) {
      toast({ title: "Atención", description: "El teléfono es obligatorio según tu configuración.", variant: "destructive" });
      return;
    }
    if (phoneStr) {
      const phoneRegex = /^[0-9+\-\s()]{8,20}$/;
      if (!phoneRegex.test(phoneStr)) {
        toast({ title: "Teléfono inválido", description: "Ingresá un número válido (mínimo 8 dígitos).", variant: "destructive" });
        return;
      }
    }
    
    try {
      const finalPrice = Number(manualForm.customPrice) || 0;
      let finalDeposit = 0;

      if (manualForm.paymentStatus === "full") {
          finalDeposit = finalPrice;
      } else if (manualForm.paymentStatus === "partial" && facility?.requires_deposit) {
          finalDeposit = getRequiredDeposit(finalPrice);
      }
      
      const isPaying = manualForm.paymentStatus !== "none";
      const startDateTime = new Date(`${dateStr}T${manualForm.startTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + manualForm.duration * 60000);
      
      await createBooking.mutateAsync({
        court_id: manualForm.selectedVirtualCourtId, 
        date: dateStr, 
        time: manualForm.startTime,
        // 👇 ESTA ES LA LÍNEA QUE FALTABA PARA QUE SE DIBUJE EN LA GRILLA 👇
        start_time: startDateTime.toISOString(), 
        end_time: endDateTime.toISOString(),
        user_name: nameStr, 
        user_email: emailStr, 
        user_phone: phoneStr,
        total_price: finalPrice, 
        deposit_amount: finalDeposit, 
        payment_status: manualForm.paymentStatus, 
        booking_type: "manual",
        payment_method: isPaying ? manualForm.paymentMethod : null
      } as any);
      
      toast({ title: "Reserva agendada exitosamente ✅" });
      setManualSlot(null);
    } catch (err: any) {
      const msg = err?.message?.includes("SLOT_TAKEN") ? "Este horario ya fue reservado" : err?.message;
      toast({ title: "Error al agendar", description: msg, variant: "destructive" });
    }
  };

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Vista de agenda diaria</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
            <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            
            <div className="flex flex-col items-center justify-center min-w-[260px]">
                <span className="font-bold capitalize whitespace-nowrap text-center">{format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}</span>
                {/* CARTELITO DE FERIADO */}
                {todayHoliday && (
                    <span className="text-[10px] bg-orange-500 text-white px-3 py-0.5 rounded-full font-bold mt-1 uppercase tracking-wider animate-in zoom-in duration-200 shadow-sm">
                        ⭐ Feriado: {todayHoliday.label}
                    </span>
                )}
            </div>

            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
            {!isToday && (
            <button onClick={() => setSelectedDate(new Date())} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity ml-2 shrink-0">
                <CalendarCheck className="w-3.5 h-3.5" /> Hoy
            </button>
            )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs bg-muted/30 p-2 rounded-xl border border-border/50">
            {[
            { label: "Libre", cls: "bg-slot-free border border-slot-free-border" },
            { label: "Seña (Resta)", cls: "bg-slot-deposit text-slot-deposit-foreground border-orange-500/50" },
            { label: "Abonado Total", cls: "bg-primary text-primary-foreground" },
            { label: "Manual (Resta)", cls: "bg-destructive text-destructive-foreground border-destructive/50" },
            { label: "Fijo/Liga", cls: "bg-info text-info-foreground" },
            ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5"><div className={cn("w-3 h-3 rounded", item.cls)} /><span>{item.label}</span></div>
            ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 custom-scrollbar">
          <button onClick={() => setCourtFilter("all")} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors", courtFilter === "all" ? "bg-card border border-primary text-primary shadow-sm" : "bg-muted text-muted-foreground hover:bg-card border border-transparent")}>
              Todas las canchas
          </button>
          {physicalCourts.map(pc => (
              <button key={pc.key} onClick={() => setCourtFilter(pc.key)} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors", courtFilter === pc.key ? "bg-card border border-primary text-primary shadow-sm" : "bg-muted text-muted-foreground hover:bg-card border border-transparent")}>
                  {pc.name}
              </button>
          ))}
      </div>

      {isClosed ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-3xl">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Cerrado</h2>
          <p className="text-sm text-muted-foreground">El predio no opera este día según la configuración de horarios.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-2xl bg-card shadow-sm">
          <table className="w-full" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "80px" }} />
              {visiblePhysicalCourts.map((pc) => (<col key={pc.key} />))}
            </colgroup>
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-center text-xs font-bold p-3 text-muted-foreground">Hora</th>
                {visiblePhysicalCourts.map((pc) => (<th key={pc.key} className="text-center text-sm font-bold p-3 truncate">{pc.name}</th>))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour, idx) => {
                const h = hour.split(':')[0];

                return (
                  <tr key={hour} className={cn("border-b border-border/50 last:border-0", idx % 2 === 0 ? "bg-transparent" : "bg-muted/10")}>
                    <td className="text-xs font-bold font-mono p-3 text-center text-muted-foreground border-r border-border/50 align-top">{h}:00</td>
                    
                    {visiblePhysicalCourts.map((pc) => {
                      const courtIds = pc.virtualCourts.map(c => c.id);
                      const b00 = getBookingGroup(courtIds, `${h}:00`);
                      const b30 = getBookingGroup(courtIds, `${h}:30`);

                      const isCompletelyFree = !b00 && !b30;
                      const isSameBooking = b00 && b30 && b00.id === b30.id;
                      const showSingleBlock = isCompletelyFree || isSameBooking;

                      return (
                        <td key={pc.key} className="p-1 border-r border-border/50 last:border-0 align-top">
                          {showSingleBlock ? (
                            <button onClick={() => handleSlotClick(pc, `${h}:00`)}
                              className={cn("w-full rounded-xl p-2 flex flex-col justify-center text-left text-[11px] transition-all h-[56px] border", getSlotStyle(isSameBooking ? b00 : undefined))}>
                              {isSameBooking && b00 ? (
                                <>
                                  {/* Ajustamos el layout a una columna flexible. El min-w-0 permite que el truncate funcione */}
                                  <div className="flex flex-col h-full w-full min-w-0">
                                    
                                    {/* Contenedor superior para el nombre y el ✅ (así siempre están en la misma línea) */}
                                    <div className="flex justify-between items-start w-full min-w-0">
                                        <p className="font-bold truncate text-xs flex-1 pr-1">{b00.user_name || "Sin nombre"}</p>
                                        {b00.payment_status === "full" && <span className="text-[10px] shrink-0">✅</span>}
                                    </div>
                                    
                                    {/* Contenedor inferior para el tipo de reserva */}
                                    <div className="mt-auto opacity-90 truncate w-full">
                                        <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider truncate block">
                                            {typeLabels[b00.booking_type] || b00.booking_type} • {courts.find(c => c.id === b00.court_id)?.is_event ? "EVENTO" : getSportName(courts.find(c => c.id === b00.court_id)?.sport_id || "")}
                                        </span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <span className="text-[10px] font-semibold opacity-0 hover:opacity-50 transition-opacity block w-full text-center">+ Nueva Reserva</span>
                              )}
                            </button>
                          ) : (
                            <div className="flex flex-col h-[56px] gap-1">
                              <button onClick={() => handleSlotClick(pc, `${h}:00`)}
                                className={cn("w-full rounded-md px-2 flex flex-col justify-center text-left transition-all flex-1 border overflow-hidden", getSlotStyle(b00))}>
                                {b00 ? (
                                  <div className="flex justify-between items-center w-full">
                                    <span className="font-bold truncate text-[10px]">{b00.user_name || "Ocupado"}</span>
                                  </div>
                                ) : ( <span className="text-[9px] font-semibold opacity-0 hover:opacity-50 transition-opacity block w-full text-center">+ 00 min</span> )}
                              </button>
                              
                              <button onClick={() => handleSlotClick(pc, `${h}:30`)}
                                className={cn("w-full rounded-md px-2 flex flex-col justify-center text-left transition-all flex-1 border overflow-hidden", getSlotStyle(b30))}>
                                {b30 ? (
                                  <div className="flex justify-between items-center w-full">
                                    <span className="font-bold truncate text-[10px]">{b30.user_name || "Ocupado"}</span>
                                  </div>
                                ) : ( <span className="text-[9px] font-semibold opacity-0 hover:opacity-50 transition-opacity block w-full text-center">+ 30 min</span> )}
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: DETALLE DE RESERVA EXISTENTE */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setSelectedBooking(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-4">
              <h3 className="font-extrabold text-xl">Detalle de reserva</h3>
              <button onClick={() => setSelectedBooking(null)} className="p-2 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-bold">Jugador</span>
                <span className="font-bold text-base">{selectedBooking.user_name}</span>
              </div>
              
              {selectedBooking.user_phone && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-bold flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Teléfono</span>
                  <span className="font-bold">{selectedBooking.user_phone}</span>
                </div>
              )}
              
              {selectedBooking.user_email && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-bold flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Email</span>
                  <span className="font-bold text-xs">{selectedBooking.user_email}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-bold">Cancha</span>
                <span className="font-bold">{getCourtName(selectedBooking.court_id)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-bold">Horario</span>
                <span className="font-bold">{format(new Date(selectedBooking.start_time), "HH:mm")} - {format(new Date(selectedBooking.end_time), "HH:mm")} hs</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-bold">Origen</span>
                <span className="font-bold bg-muted px-2 py-0.5 rounded-md">{typeLabels[selectedBooking.booking_type] || selectedBooking.booking_type}</span>
              </div>
              
              <div className="border-t border-border border-dashed my-4" />
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-bold">Costo Total</span>
                <span className="font-black text-lg">${selectedBooking.total_price.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-bold">Abonado</span>
                <span className="font-black text-lg text-primary">${selectedBooking.deposit_amount.toLocaleString()}</span>
              </div>
              
              {selectedBooking.total_price > selectedBooking.deposit_amount && (
                <div className="flex justify-between items-center bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 mt-2">
                    <span className="text-orange-700 font-bold">Resta Cobrar</span>
                    <span className="font-black text-orange-600 text-lg">${(selectedBooking.total_price - selectedBooking.deposit_amount).toLocaleString()}</span>
                </div>
              )}
            </div>

            {(selectedBooking.payment_status === "partial" || selectedBooking.payment_status === "none") && (
              <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3 mt-auto">
                  <label className="text-xs font-bold text-muted-foreground block">¿Cómo abona el saldo restante?</label>
                  <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map(pm => (
                                <button key={pm.value} onClick={() => setManualForm({...manualForm, paymentMethod: pm.value})} 
                                    className={cn("flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-[10px] font-bold transition-all", 
                                    manualForm.paymentMethod === pm.value ? `${pm.activeClass} shadow-sm` : `bg-card text-muted-foreground border-border ${pm.hoverClass}`)}>
                                    <pm.icon className="w-4 h-4" /> {pm.label}
                                </button>
                              ))}
                  </div>
                  <button onClick={handleCollect} disabled={updateBooking.isPending}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-black text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md">
                    Registrar Cobro
                  </button>
              </div>
            )}
            
            {!isCancelling ? (
              <button onClick={() => setIsCancelling(true)} disabled={deleteBooking.isPending || updateBooking.isPending}
                className="w-full mt-3 border-2 border-destructive/20 text-destructive py-2.5 rounded-xl text-sm font-bold hover:bg-destructive hover:text-white transition-colors disabled:opacity-50">
                Liberar Cancha (Cancelar)
              </button>
            ) : (
              <div className="mt-4 bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <h4 className="font-bold text-destructive text-sm flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/> Confirmar Cancelación</h4>
                  
                  <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">Motivo de la cancelación</label>
                      <select className="w-full appearance-none border-2 border-border/50 rounded-xl px-4 py-3 text-sm font-semibold bg-muted/30 outline-none focus:border-destructive focus:bg-background transition-all cursor-pointer" 
                              value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
                          <option value="client_excused">Avisó con tiempo (Cliente)</option>
                          <option value="no_show">Faltó sin avisar (No Show)</option>
                          <option value="club">Problema del predio (Lluvia, luz, etc)</option>
                      </select>
                  </div>

                  {selectedBooking.deposit_amount > 0 && (
                      <div>
                          <label className="text-xs font-bold text-muted-foreground mb-1 block">¿Qué hacemos con los ${selectedBooking.deposit_amount} abonados?</label>
                          <select className="w-full appearance-none border-2 border-border/50 rounded-xl px-4 py-3 text-sm font-semibold bg-muted/30 outline-none focus:border-destructive focus:bg-background transition-all cursor-pointer" 
                                  value={refundStatus} onChange={(e) => setRefundStatus(e.target.value)}>
                              <option value="none">Seleccionar acción...</option>
                              <option value="kept">Retener el dinero (Penalidad)</option>
                              <option value="refunded">Devolver el dinero al cliente</option>
                          </select>
                      </div>
                  )}

                  <div className="flex gap-2 pt-2">
                      <button onClick={() => setIsCancelling(false)} className="flex-1 py-2 rounded-lg text-xs font-bold bg-muted hover:bg-muted/80 transition-colors">Atrás</button>
                      <button onClick={handleConfirmCancel} 
                              disabled={updateBooking.isPending || (selectedBooking.deposit_amount > 0 && refundStatus === "none")} 
                              className="flex-1 py-2 rounded-lg text-xs font-bold bg-destructive text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                          Confirmar Baja
                      </button>
                  </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: RESERVA MANUAL */}
      {manualSlot && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setManualSlot(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-4">
              <h3 className="font-extrabold text-xl">Nueva Reserva</h3>
              <button onClick={() => setManualSlot(null)} className="p-2 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-5">
              {/* CORRECCIÓN 5: Usamos el nombre de la cancha física (pc) */}
              <p className="font-bold text-primary">{manualSlot.pc.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs font-semibold text-primary/80">{format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} •</p>
                <select 
                    className="bg-background border border-primary/30 rounded-md text-xs font-bold text-primary p-1 outline-none cursor-pointer"
                    value={manualForm.startTime}
                    onChange={(e) => setManualForm({...manualForm, startTime: e.target.value})}
                >
                    <option value={`${manualSlot.hour.split(':')[0]}:00`}>{manualSlot.hour.split(':')[0]}:00 hs</option>
                    <option value={`${manualSlot.hour.split(':')[0]}:30`}>{manualSlot.hour.split(':')[0]}:30 hs</option>
                </select>
              </div>
            </div>

            {/* CORRECCIÓN 6: Selector inteligente (Detecta Eventos) */}
            {manualSlot.pc.virtualCourts.length > 1 && (
                <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Variante a reservar</label>
                    <select 
                        className="w-full border-2 border-primary/30 rounded-xl px-3 py-2.5 text-sm bg-primary/5 outline-none focus:border-primary font-bold text-primary cursor-pointer"
                        value={manualForm.selectedVirtualCourtId}
                        onChange={(e) => {
                            const selectedCourt = manualSlot.pc.virtualCourts.find((c: Court) => c.id === e.target.value);
                            
                            // Si elige evento, le clavamos su duración por defecto (ej: 180 min). Si no, 60 min.
                            const autoDuration = selectedCourt.is_event ? (selectedCourt.duration_minutes || 180) : 60;
                            const calculatedPrice = selectedCourt.price_per_hour * (autoDuration / 60);

                            setManualForm({ 
                                ...manualForm, 
                                selectedVirtualCourtId: e.target.value,
                                duration: autoDuration, // Actualizamos la duración en el formulario
                                customPrice: calculatedPrice.toString() // Calculamos el precio total
                            });
                        }}
                    >
                        {manualSlot.pc.virtualCourts.map((c: Court) => (
                            <option key={c.id} value={c.id}>
                                {c.is_event 
                                    ? `🎉 Evento / Cumpleaños - $${c.price_per_hour}/hora` 
                                    : `${getSportName(c.sport_id) || "Cancha"} - $${c.price_per_hour}/hora`}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Duración</label>
                    <select 
                        className="w-full border-2 border-border/50 rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary font-bold cursor-pointer"
                        value={manualForm.duration}
                        onChange={(e) => {
                            const newDuration = Number(e.target.value);
                            // CORRECCIÓN 7: Buscamos el precio usando la variante seleccionada, no courtId
                            const basePrice = getCourtPrice(manualForm.selectedVirtualCourtId);
                            const calculatedPrice = basePrice * (newDuration / 60);
                            
                            setManualForm({ 
                                ...manualForm, 
                                duration: newDuration, 
                                customPrice: calculatedPrice.toString() 
                            });
                        }}
                    >
                        <option value={60}>1 hora</option>
                        <option value={90}>1.5 horas</option>
                        <option value={120}>2 horas</option>
                        <option value={150}>2.5 horas</option>
                        {facility?.has_events && <option value={180}>3 horas (Evento)</option>}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Precio Final ($)</label>
                    <input 
                        type="number"
                        className="w-full border-2 border-border/50 rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary font-bold text-primary" 
                        value={manualForm.customPrice} 
                        onChange={(e) => setManualForm({ ...manualForm, customPrice: e.target.value })} 
                    />
                </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Nombre del jugador <span className="text-destructive">*</span></label>
                <input className="w-full border-2 border-border/50 rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary font-semibold" value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                        Teléfono {facility?.require_phone_manual && <span className="text-destructive">*</span>}
                    </label>
                    <input className="w-full border-2 border-border/50 rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary" value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })} placeholder="1123456789" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                        Email {facility?.require_email_manual && <span className="text-destructive">*</span>}
                    </label>
                    <input className="w-full border-2 border-border/50 rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary" value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} placeholder="juan@ejemplo.com" />
                  </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                  <label className="text-xs font-bold text-muted-foreground mb-2 block">Estado del Pago Inicial</label>
                  
                  <div className={cn("grid gap-2 mb-3", facility?.requires_deposit ? "grid-cols-3" : "grid-cols-2")}>
                      <button onClick={() => setManualForm({...manualForm, paymentStatus: "none", depositAmount: ""})} className={cn("py-2 rounded-lg text-[10px] font-bold border transition-all", manualForm.paymentStatus === "none" ? "bg-orange-500/10 text-orange-600 border-orange-500/30" : "bg-card text-muted-foreground hover:bg-muted border-border")}>
                          Paga en predio
                      </button>
                      
                      {facility?.requires_deposit && (
                        <button onClick={() => setManualForm({...manualForm, paymentStatus: "partial"})} className={cn("py-2 rounded-lg text-[10px] font-bold border transition-all", manualForm.paymentStatus === "partial" ? "bg-primary/20 text-primary border-primary" : "bg-card text-muted-foreground hover:bg-muted border-border")}>
                            Abona Seña
                        </button>
                      )}

                      <button onClick={() => setManualForm({...manualForm, paymentStatus: "full", depositAmount: ""})} className={cn("py-2 rounded-lg text-[10px] font-bold border transition-all", manualForm.paymentStatus === "full" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-muted border-border")}>
                          Abona Total
                      </button>
                  </div>

                  {manualForm.paymentStatus === "partial" && facility?.requires_deposit && (
                      <div className="mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block">Monto de la seña ({facility.deposit_percentage}%)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                            <input type="number" readOnly className="w-full border-2 border-border/50 rounded-xl pl-7 pr-3 py-2 text-sm bg-muted outline-none font-bold text-foreground cursor-not-allowed" value={getRequiredDeposit(Number(manualForm.customPrice))} />
                          </div>
                      </div>
                  )}

                  {(manualForm.paymentStatus === "full" || manualForm.paymentStatus === "partial") && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block">¿Cómo abonó?</label>
                          <div className="grid grid-cols-3 gap-2">
                              {PAYMENT_METHODS.map(pm => (
                                  <button key={pm.value} onClick={() => setManualForm({...manualForm, paymentMethod: pm.value})} 
                                      className={cn("flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-[10px] font-bold transition-all", 
                                      manualForm.paymentMethod === pm.value ? `${pm.activeClass} shadow-sm` : `bg-card text-muted-foreground border-border ${pm.hoverClass}`)}>
                                      <pm.icon className="w-4 h-4" /> {pm.label}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
            </div>
            
            <button onClick={handleCreateManual} disabled={createBooking.isPending}
              className="w-full mt-6 bg-primary text-primary-foreground py-3.5 rounded-xl font-black text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md">
              {createBooking.isPending ? "Generando..." : "Agendar Reserva"}
            </button>
          </div>
        </div>
      )}
      
      {cancelledBookings.length > 0 && (
        <div className="mt-8 border-t border-destructive/20 pt-6">
            <h3 className="font-bold text-destructive flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5" /> Reservas Canceladas Hoy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cancelledBookings.map(b => (
                    <div key={b.id} className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex flex-col gap-1">
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-sm">{b.user_name || "Sin nombre"}</span>
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-bold uppercase", 
                                b.cancellation_reason === 'no_show' ? "bg-red-500 text-white" : 
                                b.cancellation_reason === 'club' ? "bg-orange-500 text-white" : "bg-muted-foreground text-white")}>
                                {b.cancellation_reason === 'no_show' ? 'No Show' : b.cancellation_reason === 'club' ? 'Predio' : 'Avisó'}
                            </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{getCourtName(b.court_id)} • {format(new Date(b.start_time), "HH:mm")} hs</span>
                        {b.deposit_amount > 0 && (
                            <span className="text-[10px] font-bold mt-1 text-destructive">
                                {b.refund_status === 'kept' ? `Seña retenida: $${b.deposit_amount}` : b.refund_status === 'refunded' ? `Seña devuelta: $${b.deposit_amount}` : 'Revisar seña'}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;