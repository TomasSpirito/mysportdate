import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
// IMPORTANTE: Sumamos useFacility a los hooks
import { useFacility, useCourts, useBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, useFacilitySchedules, type Booking } from "@/hooks/use-supabase-data";
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
  const [manualSlot, setManualSlot] = useState<{ courtId: string; hour: string } | null>(null);
  
  const [courtFilter, setCourtFilter] = useState<string>("all");

  const [manualForm, setManualForm] = useState({ 
      name: "", email: "", phone: "", paymentStatus: "none", paymentMethod: "efectivo", depositAmount: "" 
  });
  
  const [collectMethod, setCollectMethod] = useState("efectivo");

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  
  // TRAEMOS LA CONFIGURACIÓN DEL PREDIO
  const { data: facility } = useFacility();
  
  const { data: courts = [] } = useCourts();
  const { data: bookings = [] } = useBookings(dateStr);
  const { data: schedules = [] } = useFacilitySchedules();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const createBooking = useCreateBooking();

  const jsDay = getDay(selectedDate); 
  const dayIdx = jsDay === 0 ? 6 : jsDay - 1; 
  const todaySchedule = schedules.find((s) => s.day_of_week === dayIdx);
  const isClosed = todaySchedule ? !todaySchedule.is_open : false;

  const openH = todaySchedule?.is_open ? parseInt(todaySchedule.open_time.split(":")[0]) : (!todaySchedule ? 8 : -1);
  let closeH = todaySchedule?.is_open ? parseInt(todaySchedule.close_time.split(":")[0]) : (!todaySchedule ? 23 : -1);

  if (closeH <= openH && closeH >= 0) closeH += 24;

  const hours: string[] = [];
  if (openH >= 0 && closeH > openH) {
    for (let h = openH; h < closeH; h++) {
      const displayH = h % 24;
      hours.push(`${displayH.toString().padStart(2, "0")}:00`);
    }
  }

  const visibleCourts = courtFilter === "all" ? courts : courts.filter(c => c.id === courtFilter);

  const getBooking = (courtId: string, hour: string) =>
      bookings.find((b) => { 
        // new Date() lee la hora de Londres y la convierte a tu hora local automáticamente
        const dateObj = new Date(b.start_time);
        const bHour = dateObj.getHours().toString().padStart(2, "0");
        // Armamos el texto "HH:00" para que coincida con la grilla
        return b.court_id === courtId && `${bHour}:00` === hour; 
      });

  const getCourtName = (courtId: string) => courts.find((c) => c.id === courtId)?.name || "";
  const getCourtPrice = (courtId: string) => courts.find((c) => c.id === courtId)?.price_per_hour || 0;

  // Calculador matemático de la seña según la configuración del predio
  const getRequiredDeposit = (courtId: string) => {
      if (!facility?.requires_deposit) return 0;
      const price = getCourtPrice(courtId);
      const percentage = facility.deposit_percentage || 50;
      return (price * percentage) / 100;
  };

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
        id: selectedBooking.id, 
        payment_status: "full", 
        deposit_amount: selectedBooking.total_price,
        payment_method: collectMethod 
    } as any);
    toast({ title: "Pago registrado en caja ✅" });
    setSelectedBooking(null);
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    if (!confirm("¿Seguro que querés cancelar esta reserva? Se liberará la cancha.")) return;
    await deleteBooking.mutateAsync(selectedBooking.id);
    toast({ title: "Reserva cancelada" });
    setSelectedBooking(null);
  };

  const handleSlotClick = (courtId: string, hour: string) => {
    const booking = getBooking(courtId, hour);
    if (booking) {
      setSelectedBooking(booking);
      setCollectMethod(booking.payment_method || "efectivo");
    } else {
      setManualSlot({ courtId, hour });
      setManualForm({ name: "", email: "", phone: "", paymentStatus: "none", paymentMethod: "efectivo", depositAmount: "" });
    }
  };

 const handleCreateManual = async () => {
    const nameStr = manualForm.name.trim();
    const emailStr = manualForm.email.trim();
    const phoneStr = manualForm.phone.trim();

    if (!manualSlot || !nameStr || !emailStr || !phoneStr) {
      toast({ title: "Completá todos los campos obligatorios", variant: "destructive" });
      return;
    }

    // VALIDACIONES CON REGEX
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) {
      toast({ title: "Email inválido", description: "Por favor ingresá un correo electrónico real.", variant: "destructive" });
      return;
    }

    const phoneRegex = /^[0-9+\-\s()]{8,20}$/;
    if (!phoneRegex.test(phoneStr)) {
      toast({ title: "Teléfono inválido", description: "Ingresá un número válido (mínimo 8 dígitos).", variant: "destructive" });
      return;
    }
    
    try {
      const price = getCourtPrice(manualSlot.courtId);
      let finalDeposit = 0;

      if (manualForm.paymentStatus === "full") {
          finalDeposit = price;
      } else if (manualForm.paymentStatus === "partial" && facility?.requires_deposit) {
          finalDeposit = getRequiredDeposit(manualSlot.courtId);
      }
      
      const isPaying = manualForm.paymentStatus !== "none";
      
      await createBooking.mutateAsync({
        court_id: manualSlot.courtId, date: dateStr, time: manualSlot.hour,
        user_name: nameStr, user_email: emailStr, user_phone: phoneStr,
        total_price: price, 
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
            {/* CORRECCIÓN VISUAL: Añadimos min-w-[260px] y whitespace-nowrap para que la fecha y el año no se partan */}
            <span className="font-bold capitalize min-w-[260px] whitespace-nowrap text-center">{format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}</span>
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
          {courts.map(c => (
              <button key={c.id} onClick={() => setCourtFilter(c.id)} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors", courtFilter === c.id ? "bg-card border border-primary text-primary shadow-sm" : "bg-muted text-muted-foreground hover:bg-card border border-transparent")}>
                  {c.name}
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
              {visibleCourts.map((c) => (<col key={c.id} />))}
            </colgroup>
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-center text-xs font-bold p-3 text-muted-foreground">Hora</th>
                {visibleCourts.map((c) => (<th key={c.id} className="text-center text-sm font-bold p-3 truncate">{c.name}</th>))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour, idx) => (
                <tr key={hour} className={cn("border-b border-border/50 last:border-0", idx % 2 === 0 ? "bg-transparent" : "bg-muted/10")}>
                  <td className="text-xs font-bold font-mono p-3 text-center text-muted-foreground border-r border-border/50">{hour}</td>
                  {visibleCourts.map((court) => {
                    const booking = getBooking(court.id, hour);
                    return (
                      <td key={court.id} className="p-1.5 border-r border-border/50 last:border-0">
                        <button onClick={() => handleSlotClick(court.id, hour)}
                          className={cn("w-full rounded-xl p-2 flex flex-col justify-center text-left text-[11px] transition-all h-[56px] border", getSlotStyle(booking))}>
                          {booking && (
                            <>
                              <p className="font-bold truncate text-xs w-full">{booking.user_name || "Sin nombre"}</p>
                              <div className="flex justify-between items-center w-full mt-0.5 opacity-90">
                                  <span className="text-[10px] uppercase font-semibold tracking-wider">{typeLabels[booking.booking_type] || booking.booking_type}</span>
                                  {booking.payment_status === "full" && <span className="text-[10px]">✅</span>}
                              </div>
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
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
              <div className="flex justify-between"><span className="text-muted-foreground">Jugador</span><span className="font-bold text-base">{selectedBooking.user_name}</span></div>
              {selectedBooking.user_phone && (
                <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Teléfono</span><span className="font-semibold">{selectedBooking.user_phone}</span></div>
              )}
              {selectedBooking.user_email && (
                <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Email</span><span className="font-medium text-xs">{selectedBooking.user_email}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Cancha</span><span className="font-bold">{getCourtName(selectedBooking.court_id)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Horario</span><span className="font-bold">{format(new Date(selectedBooking.start_time), "HH:mm")} - {format(new Date(selectedBooking.end_time), "HH:mm")} hs</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Origen</span><span className="font-bold bg-muted px-2 py-0.5 rounded-md">{typeLabels[selectedBooking.booking_type] || selectedBooking.booking_type}</span></div>
              
              <div className="border-t border-border border-dashed my-3" />
              
              <div className="flex justify-between"><span className="text-muted-foreground font-medium">Costo Total</span><span className="font-black text-lg">${selectedBooking.total_price.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground font-medium">Abonado</span><span className="font-black text-primary">${selectedBooking.deposit_amount.toLocaleString()}</span></div>
              
              {selectedBooking.total_price > selectedBooking.deposit_amount && (
                <div className="flex justify-between bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">
                    <span className="text-orange-700 font-bold">Resta Cobrar</span>
                    <span className="font-black text-orange-600 text-lg">${(selectedBooking.total_price - selectedBooking.deposit_amount).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* SECCIÓN DE COBRO CON MÉTODO DE PAGO */}
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
            
            <button onClick={handleCancel} disabled={deleteBooking.isPending}
              className="w-full mt-3 border-2 border-destructive/20 text-destructive py-2.5 rounded-xl text-sm font-bold hover:bg-destructive hover:text-white transition-colors disabled:opacity-50">
              Liberar Cancha (Cancelar)
            </button>
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
              <p className="font-bold text-primary">{getCourtName(manualSlot.courtId)}</p>
              <p className="text-xs font-semibold text-primary/80">{format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} • {manualSlot.hour} hs</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Nombre del jugador *</label>
                <input className="w-full border-2 border-border/50 rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary font-semibold" value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Teléfono *</label>
                    <input className="w-full border-2 border-border/50 rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary" value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })} placeholder="1123456789" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Email *</label>
                    <input className="w-full border-2 border-border/50 rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary" value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} placeholder="juan@ejemplo.com" />
                  </div>
              </div>

              {/* LÓGICA DE SEÑA CONDICIONADA AL PREDIO */}
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

                  {/* INPUT SEÑA LECTURA (Cálculo Automático) */}
                  {manualForm.paymentStatus === "partial" && facility?.requires_deposit && (
                      <div className="mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block">Monto de la seña ({facility.deposit_percentage}%)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                            <input type="number" readOnly className="w-full border-2 border-border/50 rounded-xl pl-7 pr-3 py-2 text-sm bg-muted outline-none font-bold text-foreground cursor-not-allowed" value={getRequiredDeposit(manualSlot.courtId)} />
                          </div>
                      </div>
                  )}

                  {/* METODO DE PAGO (SOLO SI HAY PAGO) */}
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
    </AdminLayout>
  );
};

export default AdminDashboard;