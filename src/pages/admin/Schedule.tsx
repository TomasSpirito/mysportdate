import { useState, useMemo } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useCourts, useBookings, useCreateBooking, useDeleteBooking, type Booking } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { format, getDay, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, X, Trash2, Calendar, Search, CreditCard, Settings, CalendarDays, CalendarPlus, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const HOURS = Array.from({ length: 16 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);

const AdminSchedule = () => {
  const { data: courts = [] } = useCourts();
  const { data: allBookings = [] } = useBookings();
  const fixedBookings = useMemo(() => allBookings.filter((b) => b.booking_type === "fixed" && b.status !== "cancelled"), [allBookings]);

  const createBooking = useCreateBooking();
  const deleteBooking = useDeleteBooking();

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  // ESTADO PARA POPUP DE ELIMINACIÓN CUSTOM
  const [deletePrompt, setDeletePrompt] = useState<{ type: "single" | "group", id?: string, group?: any } | null>(null);

  // ESTADO DEL MODAL DE GESTIÓN (Edición)
  const [manageGroup, setManageGroup] = useState<{ main: Booking; count: number; key: string; allBookings: Booking[] } | null>(null);
  const [extraDate, setExtraDate] = useState("");

  const [form, setForm] = useState({ 
    court_id: "", days: [] as number[], hour: "20:00", name: "", phone: "", 
    startDate: format(new Date(), "yyyy-MM-dd"), endDate: format(addMonths(new Date(), 3), "yyyy-MM-dd"), paymentMode: "none" 
  });

  const getCourtPrice = (id: string) => courts.find((c) => c.id === id)?.price_per_hour || 0;
  const getCourtName = (id: string) => courts.find((c) => c.id === id)?.name || "";
  
  const datesToBook = useMemo(() => {
      const dates: string[] = [];
      if (!form.startDate || !form.endDate || form.days.length === 0) return dates;
      let current = new Date(form.startDate + "T12:00:00");
      const end = new Date(form.endDate + "T12:00:00");
      while (current <= end) {
        if (form.days.includes(getDay(current))) dates.push(format(current, "yyyy-MM-dd"));
        current = new Date(current.getTime() + 86400000); 
      }
      return dates;
  }, [form.startDate, form.endDate, form.days]);

  const totalSessions = datesToBook.length;
  const pricePerSession = getCourtPrice(form.court_id);
  const totalPrice = totalSessions * pricePerSession;

  const initialPaymentAmount = useMemo(() => {
      if (form.paymentMode === "none") return 0;
      if (form.paymentMode === "full") return totalPrice;
      if (form.paymentMode === "first_month") {
          const startMs = new Date(form.startDate + "T12:00:00").getTime();
          return datesToBook.filter(d => ((new Date(d + "T12:00:00").getTime() - startMs) / 86400000) <= 31).length * pricePerSession;
      }
      return 0;
  }, [form.paymentMode, datesToBook, form.startDate, pricePerSession, totalPrice]);

  const handleCreate = async () => {
    if (!form.court_id || !form.name.trim() || form.days.length === 0 || datesToBook.length === 0) {
      toast({ title: "Revisá los datos ingresados", variant: "destructive" });
      return;
    }
    try {
      let created = 0, skipped = 0;
      const startMs = new Date(form.startDate + "T12:00:00").getTime();

      for (const dateStr of datesToBook) {
        let status = "none";
        let deposit = 0;
        if (form.paymentMode === "full") { status = "full"; deposit = pricePerSession; } 
        else if (form.paymentMode === "first_month" && ((new Date(dateStr + "T12:00:00").getTime() - startMs) / 86400000) <= 31) {
            status = "full"; deposit = pricePerSession;
        }
        try {
          await createBooking.mutateAsync({
            court_id: form.court_id, date: dateStr, time: form.hour, user_name: form.name.trim(), user_email: "", user_phone: form.phone.trim(),
            total_price: pricePerSession, deposit_amount: deposit, payment_status: status, booking_type: "fixed",
          });
          created++;
        } catch { skipped++; }
      }
      toast({ title: `Ciclo creado: ${created} turnos agregados${skipped > 0 ? ` (${skipped} omitidos)` : ""}` });
      setShowModal(false);
    } catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  // --- LÓGICA UNIFICADA DE ELIMINACIÓN CON POPUP CUSTOM ---
  const confirmDeletion = async () => {
      if (!deletePrompt) return;
      try {
          if (deletePrompt.type === "group" && deletePrompt.group) {
              const group = deletePrompt.group;
              for (const b of group.allBookings) await deleteBooking.mutateAsync(b.id);
              toast({ title: "Ciclo eliminado por completo" });
              setManageGroup(null); // Por si estaba abierto el modal
          } else if (deletePrompt.type === "single" && deletePrompt.id) {
              await deleteBooking.mutateAsync(deletePrompt.id);
              toast({ title: "Fecha cancelada" });
              if (manageGroup) {
                  const newBookings = manageGroup.allBookings.filter(b => b.id !== deletePrompt.id);
                  if (newBookings.length === 0) setManageGroup(null);
                  else setManageGroup({ ...manageGroup, allBookings: newBookings, count: newBookings.length });
              }
          }
      } catch {
          toast({ title: "Error al eliminar", variant: "destructive" });
      } finally {
          setDeletePrompt(null);
      }
  };

  // AGREGAR UNA FECHA EXTRA DESDE EL GESTOR
  const handleAddExtraDate = async () => {
      if (!manageGroup || !extraDate) return;
      try {
          await createBooking.mutateAsync({
              court_id: manageGroup.main.court_id, date: extraDate, time: format(new Date(manageGroup.main.start_time), "HH:mm"),
              user_name: manageGroup.main.user_name, user_email: manageGroup.main.user_email, user_phone: manageGroup.main.user_phone,
              total_price: manageGroup.main.total_price, deposit_amount: 0, payment_status: "none", booking_type: "fixed"
          });
          toast({ title: "Fecha extra agregada exitosamente" });
          setExtraDate("");
          setManageGroup(null);
      } catch (err: any) {
          toast({ title: "La cancha ya está ocupada ese día", variant: "destructive" });
      }
  };

  const toggleDay = (day: number) => setForm((f) => ({ ...f, days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day] }));

  // --- AGRUPACIÓN POR CLIENTE (CLUB) ---
  const grouped = useMemo(() => {
    const map = new Map<string, { main: Booking; count: number; key: string; allBookings: Booking[] }>();
    fixedBookings.forEach((b) => {
      // Clave: Sólo el nombre del usuario para unificar sus diferentes días
      const key = b.user_name?.toLowerCase().trim() || "sin nombre";
      const existing = map.get(key);
      if (existing) {
          existing.count++;
          existing.allBookings.push(b);
      } else {
          map.set(key, { main: b, count: 1, key, allBookings: [b] });
      }
    });
    const arr = Array.from(map.values());
    
    // Ordenamos cronológicamente dentro de cada grupo
    arr.forEach(g => g.allBookings.sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    // Ordenamos los grupos alfabéticamente
    arr.sort((a, b) => (a.main.user_name || "").localeCompare(b.main.user_name || ""));
    
    return arr;
  }, [fixedBookings]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped.filter((g) => g.main.user_name?.toLowerCase().includes(q) || getCourtName(g.main.court_id).toLowerCase().includes(q));
  }, [grouped, search]);

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-extrabold">Agenda - Turnos Fijos</h1>
            <p className="text-sm text-muted-foreground">Gestioná los turnos recurrentes y academias</p>
        </div>
        <button onClick={() => { setForm({ court_id: courts[0]?.id || "", days: [], hour: "20:00", name: "", phone: "", startDate: format(new Date(), "yyyy-MM-dd"), endDate: format(addMonths(new Date(), 3), "yyyy-MM-dd"), paymentMode: "none" }); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm">
          <CalendarPlus className="w-4 h-4" /> Nuevo Turno Fijo
        </button>
      </div>

      <div className="relative w-full max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input className="w-full border-2 border-border/50 rounded-xl pl-9 pr-3 py-3 text-sm bg-card outline-none focus:border-primary transition-colors shadow-sm" placeholder="Buscar equipo o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 border border-dashed border-border/50 rounded-2xl">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold">{search ? "No se encontraron resultados" : "No hay turnos fijos activos"}</p>
          <p className="text-sm text-muted-foreground mt-1">{search ? "Probá con otro término" : "Registrá tu primer equipo, liga o escuelita"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((g) => {
            const firstDate = g.allBookings[0];
            const lastDate = g.allBookings[g.allBookings.length - 1];
            
            // Calculamos info dinámica del grupo
            const courtsUsed = Array.from(new Set(g.allBookings.map(b => getCourtName(b.court_id)))).join(", ");
            const daysUsed = Array.from(new Set(g.allBookings.map(b => getDay(new Date(b.start_time))))).sort().map(d => DAYS[d]).join(", ");
            const totalVal = g.allBookings.reduce((sum, b) => sum + b.total_price, 0);

            return (
              <div key={g.key} className="glass-card rounded-2xl p-5 flex flex-col gap-4 border-l-4 border-primary hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <CalendarDays className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-black text-lg leading-none">{g.main.user_name}</p>
                            <p className="text-sm font-semibold text-muted-foreground mt-1 line-clamp-1" title={daysUsed}>{daysUsed}</p>
                        </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                        <p className="text-2xl font-black text-foreground">${totalVal.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Valor Total</p>
                    </div>
                </div>

                <div className="bg-muted/40 rounded-xl p-3 flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground truncate max-w-[120px] sm:max-w-[180px]" title={courtsUsed}>{courtsUsed}</span>
                    <span className="bg-background border border-border px-2 py-1 rounded-md">
                        {format(new Date(firstDate.start_time), "dd/MM")} al {format(new Date(lastDate.start_time), "dd/MM")}
                    </span>
                    <span className="text-primary font-bold">{g.count} Fechas</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                    {/* BOTÓN REDISEÑADO: Soft Primary */}
                    <button onClick={() => setManageGroup(g)} className="flex-1 bg-primary/10 text-primary py-2.5 rounded-xl text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2">
                        <Settings className="w-4 h-4" /> Gestionar Fechas
                    </button>
                    {/* BOTÓN ELIMINAR LLAMA AL NUEVO POPUP */}
                    <button onClick={() => setDeletePrompt({ type: "group", group: g })} className="p-2.5 rounded-xl border-2 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0" title="Eliminar todo el ciclo">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP PERSONALIZADO DE ELIMINACIÓN (Chau Localhost) */}
      {deletePrompt && (
        <div className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeletePrompt(null)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="font-black text-xl mb-2">
                    {deletePrompt.type === "group" ? "¿Eliminar todo el ciclo?" : "¿Cancelar esta fecha?"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                    {deletePrompt.type === "group" 
                        ? `Vas a eliminar ${deletePrompt.group?.allBookings.length} turnos futuros de este cliente. Se liberará la agenda en todos esos horarios.` 
                        : "Se cancelará esta reserva puntual y la cancha volverá a quedar disponible."}
                </p>
                <div className="flex gap-3 w-full">
                    <button onClick={() => setDeletePrompt(null)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-muted hover:bg-muted/80 transition-colors">
                        Atrás
                    </button>
                    <button onClick={confirmDeletion} disabled={deleteBooking.isPending} className="flex-1 py-3 rounded-xl font-bold text-sm bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                        {deleteBooking.isPending ? "Borrando..." : "Sí, eliminar"}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* SÚPER MODAL DE GESTIÓN (Edición y Cancelación Puntual) */}
      {manageGroup && (
        <div className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setManageGroup(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <div>
                    <h3 className="font-extrabold text-xl">Ciclo: {manageGroup.main.user_name}</h3>
                    <p className="text-sm text-muted-foreground font-medium">Gestión individual de fechas</p>
                </div>
                <button onClick={() => setManageGroup(null)} className="p-2 rounded-full hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="bg-muted/40 rounded-xl p-3 mb-4 shrink-0 flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Total activo: <b className="text-foreground">{manageGroup.count} fechas</b></span>
              </div>

              <div className="overflow-y-auto custom-scrollbar pr-2 pb-2 space-y-2 flex-1 min-h-[300px]">
                  {manageGroup.allBookings.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:border-primary/30 transition-colors bg-background">
                          <div className="flex items-center gap-3">
                              <div className={cn("w-2 h-2 rounded-full", b.payment_status === "full" ? "bg-primary" : "bg-orange-500")} />
                              <div>
                                  <p className="font-bold text-sm">{format(new Date(b.start_time), "EEEE d 'de' MMMM", { locale: es })} • {format(new Date(b.start_time), "HH:mm")} hs</p>
                                  <p className="text-[10px] text-muted-foreground uppercase">{getCourtName(b.court_id)} • {b.payment_status === "full" ? "Cobrado" : "Pendiente"}</p>
                              </div>
                          </div>
                          {/* BOTON LLAMA AL POPUP CUSTOM */}
                          <button onClick={() => setDeletePrompt({ type: "single", id: b.id })} className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg font-bold hover:bg-destructive hover:text-white transition-colors">
                              Cancelar
                          </button>
                      </div>
                  ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border shrink-0">
                  <label className="text-xs font-bold text-muted-foreground mb-2 block flex items-center gap-1"><Plus className="w-3.5 h-3.5"/> Agregar una fecha extra a este ciclo</label>
                  <div className="flex gap-2">
                      <input type="date" className="flex-1 border-2 border-border/50 rounded-xl px-3 py-2 text-sm bg-background outline-none focus:border-primary cursor-pointer" value={extraDate} onChange={(e) => setExtraDate(e.target.value)} />
                      <button onClick={handleAddExtraDate} disabled={!extraDate || createBooking.isPending} className="bg-primary text-primary-foreground px-4 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                          Sumar
                      </button>
                  </div>
              </div>
          </div>
        </div>
      )}

      {/* MODAL DE CREACIÓN DE TURNO FIJO */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between mb-5 shrink-0 border-b border-border/50 pb-4">
              <h3 className="font-extrabold text-xl">Nuevo Turno Fijo / Liga</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-2">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Nombre del equipo / Cliente</label>
                    <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Los Pumas" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Teléfono (opcional)</label>
                    <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="11..." />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Cancha</label>
                    <select className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary cursor-pointer" value={form.court_id} onChange={(e) => setForm({ ...form, court_id: e.target.value })}>
                        {courts.map((c) => <option key={c.id} value={c.id}>{c.name} (${c.price_per_hour})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Horario</label>
                    <select className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary cursor-pointer" value={form.hour} onChange={(e) => setForm({ ...form, hour: e.target.value })}>
                        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">¿Qué días juegan?</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      className={cn("px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                        form.days.includes(i) ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105" : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                      )}>
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> Inicio del ciclo</label>
                    <input type="date" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary cursor-pointer" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> Fin del ciclo</label>
                    <input type="date" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary cursor-pointer" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground mb-1.5 block flex items-center gap-1"><CreditCard className="w-3.5 h-3.5"/> Acuerdo de Pago Inicial</label>
                  <select className="w-full border-2 border-primary/30 rounded-xl px-3 py-3 text-sm font-semibold bg-primary/5 outline-none focus:border-primary cursor-pointer" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                      <option value="none">Paga clase a clase (Generar pendientes en Caja)</option>
                      <option value="first_month">Abona el 1º mes adelantado (Resto pendiente)</option>
                      <option value="full">Abona TODO el ciclo adelantado hoy</option>
                  </select>
              </div>

              {form.court_id && form.days.length > 0 && datesToBook.length > 0 ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2 mt-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total de fechas encontradas</span><span className="font-black">{totalSessions} partidos</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Valor total del ciclo</span><span className="font-black">${totalPrice.toLocaleString()}</span></div>
                  <div className="border-t border-primary/10 my-2" />
                  <div className="flex justify-between items-center">
                      <span className="font-bold text-primary text-sm">Se cobrará HOY en caja:</span>
                      <span className="font-black text-xl text-primary">${initialPaymentAmount.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                  <div className="bg-muted/50 rounded-xl p-4 text-center text-xs text-muted-foreground border border-dashed border-border/50 mt-2">
                      Seleccioná días y fechas válidas para ver el resumen
                  </div>
              )}
            </div>
            
            <button onClick={handleCreate} disabled={createBooking.isPending || datesToBook.length === 0}
              className="w-full mt-4 bg-primary text-primary-foreground py-4 rounded-xl font-black text-base hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shrink-0">
              {createBooking.isPending ? "Generando turnos..." : "Confirmar Turno Fijo"}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSchedule;