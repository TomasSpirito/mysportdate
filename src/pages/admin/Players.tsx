import AdminLayout from "@/components/layout/AdminLayout";
import { useBookingsRange } from "@/hooks/use-supabase-data";
import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Users, Search, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientData {
  name: string;
  phone: string;
  email: string;
  totalBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  lastBooking: string;
  attendanceRate: number;
}

const AdminPlayers = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");

  const { data: monthBookings = [] } = useBookingsRange(monthStart, monthEnd);
  

  const clients = useMemo(() => {
    const map = new Map<string, ClientData>();

    monthBookings.forEach((b) => {
      const key = (b.user_phone || b.user_name || "").toLowerCase().trim();
      if (!key) return;
      const existing = map.get(key) || {
        name: b.user_name || "Sin nombre",
        phone: b.user_phone || "",
        email: b.user_email || "",
        totalBookings: 0,
        cancelledBookings: 0,
        totalSpent: 0,
        lastBooking: "",
        attendanceRate: 0,
      };
      existing.totalBookings++;
      if (b.status === "cancelled") existing.cancelledBookings++;
      existing.totalSpent += b.total_price;
      if (!existing.lastBooking || b.start_time > existing.lastBooking) existing.lastBooking = b.start_time;
      if (b.user_name && existing.name === "Sin nombre") existing.name = b.user_name;
      if (b.user_email && !existing.email) existing.email = b.user_email;
      map.set(key, existing);
    });

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        attendanceRate: c.totalBookings > 0 ? Math.round(((c.totalBookings - c.cancelledBookings) / c.totalBookings) * 100) : 100,
      }))
      .sort((a, b) => b.totalBookings - a.totalBookings);
  }, [monthBookings]);

  const monthStats = useMemo(() => {
    const uniquePhones = new Set(monthBookings.map((b) => b.user_phone || b.user_name).filter(Boolean));
    const cancelled = monthBookings.filter((b) => b.status === "cancelled").length;
    const total = monthBookings.length;
    return {
      uniqueClients: uniquePhones.size,
      attendanceRate: total > 0 ? Math.round(((total - cancelled) / total) * 100) : 100,
      totalBookings: total,
    };
  }, [monthBookings]);

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filtered = search
    ? clients.filter((c) => {
        const q = normalize(search);
        return normalize(c.name).includes(q) || c.phone.includes(search) || normalize(c.email).includes(q);
      })
    : clients;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Jugadores</h1>
        <p className="text-sm text-muted-foreground">Base de datos de tus clientes</p>
      </div>

      {/* Month picker */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => setSelectedDate(addMonths(selectedDate, -1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
        <span className="font-bold capitalize">{format(selectedDate, "MMMM yyyy", { locale: es })}</span>
        <button onClick={() => setSelectedDate(addMonths(selectedDate, 1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => setSelectedDate(new Date())} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity ml-auto">Hoy</button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-muted-foreground mb-1">Clientes del mes</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-primary">{monthStats.uniqueClients}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-muted-foreground mb-1">Asistencia</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-primary">{monthStats.attendanceRate}%</p>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-muted-foreground mb-1">Total histórico</p>
          <p className="text-2xl sm:text-3xl font-extrabold">{clients.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm"
        />
      </div>

      {/* Client list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No se encontraron clientes" : "Aún no hay clientes registrados. Se agregarán automáticamente con cada reserva."}
            </p>
          </div>
        ) : (
          filtered.map((client, i) => (
            <div key={i} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{client.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {client.phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs shrink-0">
                <div className="text-center">
                  <p className="font-bold text-base">{client.totalBookings}</p>
                  <p className="text-muted-foreground">Turnos</p>
                </div>
                <div className="text-center">
                  <p className={cn("font-bold text-base", client.attendanceRate >= 80 ? "text-primary" : "text-destructive")}>
                    {client.attendanceRate}%
                  </p>
                  <p className="text-muted-foreground">Asistencia</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-base">${client.totalSpent.toLocaleString()}</p>
                  <p className="text-muted-foreground">Gastado</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPlayers;
