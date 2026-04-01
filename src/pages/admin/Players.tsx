import AdminLayout from "@/components/layout/AdminLayout";
import { useBookingsRange } from "@/hooks/use-supabase-data";
import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Users, Search, Phone, Mail, CalendarDays, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllBookingsForPlayers } from "@/hooks/use-supabase-data";

interface ClientData {
  name: string;
  phone: string;
  email: string;
  totalBookings: number;
  cancelledBookings: number;
  evaluableBookings: number; // <-- NUEVO
  totalSpent: number;
  lastBooking: string;
  attendanceRate: number;
}

type SortKey = keyof ClientData;

const AdminPlayers = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState("");
  
  // Estado para el ordenamiento (Por defecto: Última reserva, más reciente primero)
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "lastBooking",
    direction: "desc",
  });

  const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");

  const { data: monthBookings = [] } = useAllBookingsForPlayers(monthStart, monthEnd);

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
        evaluableBookings: 0, // <-- NUEVO
        totalSpent: 0,
        lastBooking: "",
        attendanceRate: 0,
      };
      
      // Siempre sumamos al total de turnos históricos (para la columna "Turnos")
      existing.totalBookings++;
      
      // Determinamos si la reserva cuenta para medir asistencia (excluimos las que canceló el club)
      if (!(b.status === "cancelled" && b.cancellation_reason === "club")) {
          existing.evaluableBookings++;
      }
      
      // Si se canceló y NO fue culpa del club (es decir, "no_show" o "client_excused") -> ES FALTA
      if (b.status === "cancelled" && b.cancellation_reason !== "club") {
          existing.cancelledBookings++;
      }
      
      // Si la reserva no se canceló (se jugó normalmente), sumamos la plata gastada
      if (b.status !== "cancelled") {
          existing.totalSpent += b.total_price;
      }
      
      // Actualizamos la última vez que reservó
      if (!existing.lastBooking || b.start_time > existing.lastBooking) existing.lastBooking = b.start_time;
      if (b.user_name && existing.name === "Sin nombre") existing.name = b.user_name;
      if (b.user_email && !existing.email) existing.email = b.user_email;
      
      map.set(key, existing);
    });

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        // El porcentaje ahora usa los "evaluables" como base
        attendanceRate: c.evaluableBookings > 0 
            ? Math.round(((c.evaluableBookings - c.cancelledBookings) / c.evaluableBookings) * 100) 
            : 100,
      }));
  }, [monthBookings]);

  const monthStats = useMemo(() => {
    const uniquePhones = new Set(monthBookings.map((b) => b.user_phone || b.user_name).filter(Boolean));
    
    // Solo medimos la asistencia del mes en base a turnos que NO canceló el predio
    const evaluableBookings = monthBookings.filter(b => !(b.status === "cancelled" && b.cancellation_reason === "club"));
    const userFaults = evaluableBookings.filter(b => b.status === "cancelled").length;
    const totalEvaluable = evaluableBookings.length;
    
    return {
      uniqueClients: uniquePhones.size,
      attendanceRate: totalEvaluable > 0 ? Math.round(((totalEvaluable - userFaults) / totalEvaluable) * 100) : 100,
      totalBookings: monthBookings.length, // Total bruto para visualización
    };
  }, [monthBookings]);

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // 1. Primero filtramos por búsqueda
  const filteredClients = useMemo(() => {
    if (!search) return clients;
    const q = normalize(search);
    return clients.filter((c) => normalize(c.name).includes(q) || c.phone.includes(search) || normalize(c.email).includes(q));
  }, [clients, search]);

  // 2. Luego ordenamos el resultado
  const sortedAndFiltered = useMemo(() => {
    const sortableItems = [...filteredClients];
    
    sortableItems.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Convertir a minúsculas si es string para orden alfabético
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      // Lógica para empujar clientes sin "Última Reserva" al fondo de la lista
      if (aValue === "" && bValue !== "") return 1;
      if (bValue === "" && aValue !== "") return -1;

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    
    return sortableItems;
  }, [filteredClients, sortConfig]);

  // Función para manejar clics en los encabezados
  const requestSort = (key: SortKey) => {
    let direction: "asc" | "desc" = "desc"; // Por defecto al hacer clic nuevo, ordena de mayor a menor
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  // Componente visual para la flechita de orden
  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />;
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Base de Jugadores</h1>
            <p className="text-sm text-muted-foreground">Historial, asistencia y fidelización de clientes</p>
        </div>
        
        {/* Month picker */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1 shadow-sm w-fit">
            <button onClick={() => setSelectedDate(addMonths(selectedDate, -1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-bold capitalize text-sm min-w-[120px] text-center">{format(selectedDate, "MMMM yyyy", { locale: es })}</span>
            <button onClick={() => setSelectedDate(addMonths(selectedDate, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setSelectedDate(new Date())} className="ml-1 bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Hoy</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-2xl p-5 border-l-4 border-l-primary flex flex-col justify-center">
          <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Clientes del mes</p>
          <p className="text-3xl font-black text-foreground">{monthStats.uniqueClients}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 border-l-4 border-l-info flex flex-col justify-center">
          <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Asistencia Promedio</p>
          <p className="text-3xl font-black text-info">{monthStats.attendanceRate}%</p>
        </div>
        <div className="glass-card rounded-2xl p-5 border-l-4 border-l-foreground flex flex-col justify-center">
          <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Total Histórico</p>
          <p className="text-3xl font-black text-foreground">{clients.length}</p>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="glass-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
        
        {/* Search Bar Integrada */}
        <div className="p-4 border-b border-border/50 bg-muted/20">
            <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, teléfono o email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
            </div>
        </div>

        {/* Estructura de Tabla con Ordenamiento */}
        <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-bold border-b border-border/50 select-none">
                    <tr>
                        <th className="px-6 py-4 rounded-tl-xl cursor-pointer group hover:bg-muted/50 transition-colors" onClick={() => requestSort("name")}>
                            <div className="flex items-center gap-2">Jugador <SortIcon columnKey="name" /></div>
                        </th>
                        <th className="px-6 py-4">Contacto</th>
                        <th className="px-6 py-4 cursor-pointer group hover:bg-muted/50 transition-colors" onClick={() => requestSort("lastBooking")}>
                            <div className="flex items-center justify-center gap-2">Última Reserva <SortIcon columnKey="lastBooking" /></div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer group hover:bg-muted/50 transition-colors" onClick={() => requestSort("totalBookings")}>
                            <div className="flex items-center justify-center gap-2">Turnos <SortIcon columnKey="totalBookings" /></div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer group hover:bg-muted/50 transition-colors" onClick={() => requestSort("attendanceRate")}>
                            <div className="flex items-center justify-center gap-2">Asistencia <SortIcon columnKey="attendanceRate" /></div>
                        </th>
                        <th className="px-6 py-4 rounded-tr-xl cursor-pointer group hover:bg-muted/50 transition-colors" onClick={() => requestSort("totalSpent")}>
                            <div className="flex items-center justify-end gap-2">Total Gastado <SortIcon columnKey="totalSpent" /></div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {sortedAndFiltered.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-base font-bold text-foreground">No hay clientes</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {search ? "No se encontraron coincidencias para tu búsqueda." : "Los clientes se agregarán automáticamente al recibir reservas."}
                                </p>
                            </td>
                        </tr>
                    ) : (
                        sortedAndFiltered.map((client, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors group">
                                {/* Col 1: Perfil (Jugador) */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0 border border-primary/20">
                                            {client.name.charAt(0).toUpperCase()}
                                        </div>
                                        <p className="font-bold text-sm text-foreground capitalize truncate max-w-[150px]">{client.name}</p>
                                    </div>
                                </td>

                                {/* Col 2: Contacto (Separado y apilado) */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground font-medium">
                                        {client.phone ? (
                                            <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground/70" />{client.phone}</span>
                                        ) : (
                                            <span className="text-muted-foreground/50">-</span>
                                        )}
                                        {client.email && (
                                            <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground/70" />{client.email}</span>
                                        )}
                                    </div>
                                </td>

                                {/* Col 3: Última Reserva */}
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                    {client.lastBooking ? (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                                            <CalendarDays className="w-3.5 h-3.5" />
                                            {format(new Date(client.lastBooking), "dd MMM", { locale: es })}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                </td>

                                {/* Col 4: Turnos Totales */}
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <span className="font-black text-foreground text-base">{client.totalBookings}</span>
                                </td>

                                {/* Col 5: Asistencia (Badges) */}
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <span className={cn(
                                        "inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-black min-w-[3.5rem]",
                                        client.attendanceRate >= 80 ? "bg-green-100 text-green-700 border border-green-200" : 
                                        client.attendanceRate >= 50 ? "bg-yellow-100 text-yellow-700 border border-yellow-200" : 
                                        "bg-red-100 text-red-700 border border-red-200"
                                    )}>
                                        {client.attendanceRate}%
                                    </span>
                                </td>

                                {/* Col 6: Dinero Gastado */}
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                    <span className="font-black text-base text-foreground">
                                        ${client.totalSpent.toLocaleString()}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPlayers;