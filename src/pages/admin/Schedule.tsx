import { useState, useMemo } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useCourts, useBookings, useCreateBooking, useDeleteBooking, type Booking } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { format, addWeeks, addDays, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, X, Trash2, Calendar, Search } from "lucide-react";
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
  const [form, setForm] = useState({ court_id: "", days: [] as number[], hour: "20:00", name: "", phone: "", weeks: 8 });
  const [search, setSearch] = useState("");

  const handleCreate = async () => {
    if (!form.court_id || !form.name.trim() || form.days.length === 0) {
      toast({ title: "Completá los campos y seleccioná al menos un día", variant: "destructive" });
      return;
    }
    try {
      let created = 0;
      let skipped = 0;
      for (const day of form.days) {
        const today = new Date();
        const currentDay = getDay(today);
        let daysUntil = day - currentDay;
        if (daysUntil < 0) daysUntil += 7;
        if (daysUntil === 0) daysUntil = 0; // Today counts if it's the selected day
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
            created++;
          } catch {
            skipped++;
          }
        }
      }
      const dayNames = form.days.map((d) => DAYS[d]).join(", ");
      toast({ title: `Turno fijo creado: ${created} turnos (${dayNames})${skipped > 0 ? `, ${skipped} conflictos omitidos` : ""}` });
      setShowModal(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDeleteFixed = async (booking: Booking) => {
    if (!confirm("¿Eliminar este turno fijo?")) return;
    await deleteBooking.mutateAsync(booking.id);
    toast({ title: "Turno eliminado" });
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const getCourtName = (id: string) => courts.find((c) => c.id === id)?.name || "";

  // Group fixed bookings by day-of-week + hour + court + name
  const grouped = useMemo(() => {
    const map = new Map<string, { booking: Booking; count: number; key: string }>();
    fixedBookings.forEach((b) => {
      const d = new Date(b.start_time);
      const key = `${getDay(d)}-${d.getUTCHours()}-${b.court_id}-${b.user_name}`;
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { booking: b, count: 1, key });
    });
    const arr = Array.from(map.values());
    // Sort by day of week
    arr.sort((a, b) => {
      const dayA = getDay(new Date(a.booking.start_time));
      const dayB = getDay(new Date(b.booking.start_time));
      if (dayA !== dayB) return dayA - dayB;
      const hourA = new Date(a.booking.start_time).getUTCHours();
      const hourB = new Date(b.booking.start_time).getUTCHours();
      return hourA - hourB;
    });
    return arr;
  }, [fixedBookings]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped.filter((g) =>
      g.booking.user_name?.toLowerCase().includes(q) ||
      getCourtName(g.booking.court_id).toLowerCase().includes(q) ||
      DAYS[getDay(new Date(g.booking.start_time))].toLowerCase().includes(q)
    );
  }, [grouped, search]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Agenda - Turnos Fijos</h1>
        <p className="text-sm text-muted-foreground">Gestioná los turnos recurrentes semanales</p>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => { setForm({ court_id: courts[0]?.id || "", days: [], hour: "20:00", name: "", phone: "", weeks: 8 }); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Nuevo turno fijo
        </button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full border border-border rounded-xl pl-9 pr-3 py-2 text-sm bg-transparent outline-none focus:border-primary"
            placeholder="Buscar por nombre, cancha o día..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-muted/50 rounded-2xl">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold">{search ? "No se encontraron resultados" : "No hay turnos fijos registrados"}</p>
          <p className="text-sm text-muted-foreground mt-1">{search ? "Probá con otro término" : "Creá uno para equipos o grupos recurrentes"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => {
            const d = new Date(g.booking.start_time);
            const dayOfWeek = getDay(d);
            return (
              <div key={g.key} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-info" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{g.booking.user_name}</p>
                  <p className="text-xs text-muted-foreground">{DAYS[dayOfWeek]} • {d.getUTCHours().toString().padStart(2, "0")}:00 hs</p>
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
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Días de la semana</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        form.days.includes(i) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
                      )}>
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
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
