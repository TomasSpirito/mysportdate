import { useState, useMemo } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useCourts, useBookings, useCreateBooking, useDeleteBooking, type Booking } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { format, addWeeks, addDays, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, X, Trash2, Calendar, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const HOURS = Array.from({ length: 16 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);

const AdminSchedule = () => {
  const { data: courts = [] } = useCourts();
  const today = format(new Date(), "yyyy-MM-dd");
  const futureDate = format(addWeeks(new Date(), 12), "yyyy-MM-dd");

  // Fetch a wide range to show fixed bookings
  const { data: allBookings = [] } = useBookings();
  const fixedBookings = useMemo(() => allBookings.filter((b) => b.booking_type === "fixed" && b.status !== "cancelled"), [allBookings]);

  const createBooking = useCreateBooking();
  const deleteBooking = useDeleteBooking();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ court_id: "", day: 1, hour: "20:00", name: "", phone: "", weeks: 8 });

  const handleCreate = async () => {
    if (!form.court_id || !form.name.trim()) { toast({ title: "Completá los campos", variant: "destructive" }); return; }
    try {
      const today = new Date();
      // Find next occurrence of the selected day
      const currentDay = getDay(today);
      let daysUntil = form.day - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      const firstDate = addDays(today, daysUntil);

      for (let w = 0; w < form.weeks; w++) {
        const date = addWeeks(firstDate, w);
        const dateStr = format(date, "yyyy-MM-dd");
        try {
          await createBooking.mutateAsync({
            court_id: form.court_id, date: dateStr, time: form.hour,
            user_name: form.name.trim(), user_email: "", user_phone: form.phone.trim(),
            total_price: 0, deposit_amount: 0, payment_status: "none", booking_type: "fixed",
          });
        } catch {
          // Skip conflicts
        }
      }
      toast({ title: `Turno fijo creado para ${form.weeks} semanas` });
      setShowModal(false);
    } catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  const handleDeleteFixed = async (booking: Booking) => {
    if (!confirm("¿Eliminar este turno fijo?")) return;
    await deleteBooking.mutateAsync(booking.id);
    toast({ title: "Turno eliminado" });
  };

  const getCourtName = (id: string) => courts.find((c) => c.id === id)?.name || "";

  // Group fixed bookings by day-of-week + hour + court for display
  const grouped = useMemo(() => {
    const map = new Map<string, { booking: Booking; count: number; key: string }>();
    fixedBookings.forEach((b) => {
      const d = new Date(b.start_time);
      const key = `${getDay(d)}-${d.getUTCHours()}-${b.court_id}-${b.user_name}`;
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { booking: b, count: 1, key });
    });
    return Array.from(map.values());
  }, [fixedBookings]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Agenda - Turnos Fijos</h1>
        <p className="text-sm text-muted-foreground">Gestioná los turnos recurrentes semanales</p>
      </div>

      <button onClick={() => { setForm({ court_id: courts[0]?.id || "", day: 1, hour: "20:00", name: "", phone: "", weeks: 8 }); setShowModal(true); }}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mb-6">
        <Plus className="w-4 h-4" /> Nuevo turno fijo
      </button>

      {grouped.length === 0 ? (
        <div className="text-center py-16 bg-muted/50 rounded-2xl">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold">No hay turnos fijos registrados</p>
          <p className="text-sm text-muted-foreground mt-1">Creá uno para equipos o grupos recurrentes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => {
            const d = new Date(g.booking.start_time);
            return (
              <div key={g.key} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-info" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{g.booking.user_name}</p>
                  <p className="text-xs text-muted-foreground">{DAYS[getDay(d)]} • {d.getUTCHours().toString().padStart(2, "0")}:00 hs</p>
                  <p className="text-xs text-muted-foreground">{getCourtName(g.booking.court_id)} • {g.count} semanas</p>
                </div>
                <button onClick={() => handleDeleteFixed(g.booking)} className="p-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg">Nuevo turno fijo</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cancha</label>
                <select className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.court_id} onChange={(e) => setForm({ ...form, court_id: e.target.value })}>
                  {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Día de la semana</label>
                <select className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Hora</label>
                <select className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.hour} onChange={(e) => setForm({ ...form, hour: e.target.value })}>
                  {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre del grupo/equipo</label>
                <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Teléfono (opcional)</label>
                <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cantidad de semanas</label>
                <input type="number" min={1} max={52} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.weeks} onChange={(e) => setForm({ ...form, weeks: Number(e.target.value) })} />
              </div>
            </div>
            <button onClick={handleCreate} disabled={createBooking.isPending}
              className="w-full mt-5 bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {createBooking.isPending ? "Creando..." : "Crear turno fijo"}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSchedule;
