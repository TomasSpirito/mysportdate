import AdminLayout from "@/components/layout/AdminLayout";
import { useBookingsRange, useCourts, useSports, useExpensesRange, useFacilitySchedules } from "@/hooks/use-supabase-data";
import { useMemo, useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, addMonths, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChevronLeft, ChevronRight, TrendingDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HEAT_HOURS = Array.from({ length: 6 }, (_, i) => i + 18);
const sportColors = ["hsl(152, 76%, 36%)", "hsl(24, 95%, 53%)", "hsl(210, 100%, 52%)", "hsl(340, 80%, 50%)", "hsl(270, 60%, 50%)", "hsl(45, 93%, 47%)"];
const courtColors = ["hsl(152, 76%, 36%)", "hsl(24, 95%, 53%)", "hsl(210, 100%, 52%)", "hsl(340, 80%, 50%)", "hsl(270, 60%, 50%)", "hsl(45, 93%, 47%)", "hsl(180, 60%, 45%)", "hsl(30, 80%, 55%)"];
const expenseCatLabels: Record<string, string> = {
  luz: "Luz", agua: "Agua", gas: "Gas", internet: "Internet", alquiler: "Alquiler",
  mantenimiento: "Mant.", limpieza: "Limpieza", proveedores: "Prov.", sueldos: "Sueldos",
  impuestos: "Impuestos", seguros: "Seguros", marketing: "Marketing", equipamiento: "Equip.", otro: "Otro",
};
const expenseColors = ["hsl(0, 84%, 60%)", "hsl(24, 95%, 53%)", "hsl(45, 93%, 47%)", "hsl(340, 80%, 50%)", "hsl(270, 60%, 50%)", "hsl(210, 100%, 52%)"];

const AdminAnalytics = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");
  const weekStart = format(subDays(selectedDate, 6), "yyyy-MM-dd");

  const { data: bookings = [] } = useBookingsRange(monthStart, monthEnd);
  const { data: weekBookings = [] } = useBookingsRange(weekStart, monthEnd);
  const { data: expenses = [] } = useExpensesRange(monthStart, monthEnd);
  const { data: courts = [] } = useCourts();
  const { data: sports = [] } = useSports();
  const { data: schedules = [] } = useFacilitySchedules();

  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const daysInMonth = endOfMonth(selectedDate).getDate();

    let totalSlots = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d);
      const dayIdx = (getDay(date) + 6) % 7;
      const sched = schedules.find((s) => s.day_of_week === dayIdx);
      if (sched && sched.is_open) {
        const openH = parseInt(sched.open_time.split(":")[0]);
        const closeH = parseInt(sched.close_time.split(":")[0]);
        totalSlots += courts.length * (closeH - openH);
      }
    }

    const occupancyRate = totalSlots > 0 ? Math.round((totalBookings / totalSlots) * 100) : 0;
    const totalRevenue = bookings.reduce((s, b) => s + b.total_price, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    // Sport breakdown
    const sportCounts: Record<string, number> = {};
    bookings.forEach((b) => {
      const court = courts.find((c) => c.id === b.court_id);
      if (court) sportCounts[court.sport_id] = (sportCounts[court.sport_id] || 0) + 1;
    });
    const sportBreakdown = sports.map((s, i) => ({
      sport: s.name, value: sportCounts[s.id] || 0,
      percentage: totalBookings > 0 ? Math.round(((sportCounts[s.id] || 0) / totalBookings) * 100) : 0,
      color: sportColors[i % sportColors.length],
    }));

    // Court breakdown
    const courtCounts: Record<string, number> = {};
    bookings.forEach((b) => { courtCounts[b.court_id] = (courtCounts[b.court_id] || 0) + 1; });
    const courtBreakdown = courts.map((c, i) => ({
      court: c.name, value: courtCounts[c.id] || 0,
      percentage: totalBookings > 0 ? Math.round(((courtCounts[c.id] || 0) / totalBookings) * 100) : 0,
      color: courtColors[i % courtColors.length],
    }));

    // Heatmap
    const heatmap: Record<string, number> = {};
    bookings.forEach((b) => {
      const d = new Date(b.start_time);
      const dayIdx = (getDay(d) + 6) % 7;
      const hour = d.getUTCHours();
      if (hour >= 18 && hour <= 23) {
        const key = `${dayIdx}-${hour}`;
        heatmap[key] = (heatmap[key] || 0) + 1;
      }
    });
    const heatmapMax = Math.max(...Object.values(heatmap), 1);

    // Cash flow last 7 days
    const cashFlow: { day: string; cash: number; digital: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(selectedDate, i);
      const dayStr = format(d, "yyyy-MM-dd");
      const dayBookings = weekBookings.filter((b) => b.start_time.startsWith(dayStr));
      const cash = dayBookings.filter((b) => b.booking_type === "manual" || b.payment_status === "none").reduce((s, b) => s + b.deposit_amount, 0);
      const digital = dayBookings.filter((b) => b.booking_type !== "manual" && b.payment_status !== "none").reduce((s, b) => s + b.deposit_amount, 0);
      cashFlow.push({ day: format(d, "EEE d", { locale: es }), cash, digital });
    }

    // Expense breakdown
    const expCats: Record<string, number> = {};
    expenses.forEach((e) => { expCats[e.category] = (expCats[e.category] || 0) + e.amount; });
    const expenseBreakdown = Object.entries(expCats).map(([cat, amount], i) => ({
      category: expenseCatLabels[cat] || cat, value: amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      color: expenseColors[i % expenseColors.length],
    })).sort((a, b) => b.value - a.value);

    // Client stats
    const uniqueClients = new Map<string, { name: string; phone: string; bookings: number; cancelled: number }>();
    bookings.forEach((b) => {
      const key = b.user_phone || b.user_name || "anon";
      const existing = uniqueClients.get(key) || { name: b.user_name || "Sin nombre", phone: b.user_phone || "", bookings: 0, cancelled: 0 };
      existing.bookings++;
      if (b.status === "cancelled") existing.cancelled++;
      uniqueClients.set(key, existing);
    });
    const totalClients = uniqueClients.size;
    const totalCancelled = bookings.filter((b) => b.status === "cancelled").length;
    const attendanceRate = totalBookings > 0 ? Math.round(((totalBookings - totalCancelled) / totalBookings) * 100) : 100;

    return { totalBookings, occupancyRate, totalRevenue, totalExpenses, netProfit, sportBreakdown, courtBreakdown, heatmap, heatmapMax, cashFlow, expenseBreakdown, totalClients, attendanceRate };
  }, [bookings, weekBookings, courts, sports, selectedDate, expenses, schedules]);

  const getHeatColor = (count: number, max: number) => {
    if (count === 0) return "bg-muted";
    const ratio = count / max;
    if (ratio < 0.33) return "bg-green-100 text-green-800";
    if (ratio < 0.66) return "bg-yellow-100 text-yellow-800";
    return "bg-red-400 text-white";
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Analíticas</h1>
        <p className="text-sm text-muted-foreground">Estadísticas y rendimiento del predio</p>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => setSelectedDate(addMonths(selectedDate, -1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
        <span className="font-bold capitalize">{format(selectedDate, "MMMM yyyy", { locale: es })}</span>
        <button onClick={() => setSelectedDate(addMonths(selectedDate, 1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => setSelectedDate(new Date())} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity ml-auto">Hoy</button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-muted-foreground mb-1">Ocupación</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-primary">{stats.occupancyRate}%</p>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-muted-foreground mb-1">Reservas</p>
          <p className="text-2xl sm:text-3xl font-extrabold">{stats.totalBookings}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-primary break-all">${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-muted-foreground mb-1">Egresos</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-destructive break-all">${stats.totalExpenses.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Ganancia neta</p>
          <p className={cn("text-2xl sm:text-3xl font-extrabold break-all", stats.netProfit >= 0 ? "text-primary" : "text-destructive")}>${stats.netProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* Client stats row */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-primary" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Clientes únicos</p>
            <p className="text-2xl font-extrabold">{stats.totalClients}</p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-primary" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Asistencia mensual</p>
            <p className="text-2xl font-extrabold text-primary">{stats.attendanceRate}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Heatmap */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">🔥 Mapa de Calor - Ocupación Semanal</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-xs text-muted-foreground p-1 w-12"></th>
                  {DAYS_SHORT.map((d) => (<th key={d} className="text-xs text-muted-foreground p-1 text-center font-medium">{d}</th>))}
                </tr>
              </thead>
              <tbody>
                {HEAT_HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="text-xs font-mono text-muted-foreground p-1">{hour}:00</td>
                    {DAYS_SHORT.map((_, dayIdx) => {
                      const key = `${dayIdx}-${hour}`;
                      const count = stats.heatmap[key] || 0;
                      const pct = stats.heatmapMax > 0 ? Math.round((count / stats.heatmapMax) * 100) : 0;
                      return (
                        <td key={dayIdx} className="p-1">
                          <div className={cn("w-full aspect-square rounded-md flex items-center justify-center text-[10px] font-bold cursor-default transition-colors", getHeatColor(count, stats.heatmapMax))}
                            title={`${DAYS_SHORT[dayIdx]} ${hour}:00 - ${pct}% Ocupado`}>
                            {count > 0 && count}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
            <span>Bajo</span><div className="w-4 h-4 rounded bg-green-100" /><div className="w-4 h-4 rounded bg-yellow-100" /><div className="w-4 h-4 rounded bg-red-400" /><span>Alto</span>
          </div>
        </div>

        {/* Cash flow */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">💰 Flujo de Caja (últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.cashFlow}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Bar dataKey="cash" stackId="a" fill="hsl(152, 76%, 36%)" name="Efectivo" />
              <Bar dataKey="digital" stackId="a" fill="hsl(210, 100%, 52%)" name="Digital" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(152, 76%, 36%)" }} /><span>Efectivo</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(210, 100%, 52%)" }} /><span>Digital</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sport breakdown */}
        {stats.sportBreakdown.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-4">⚽ Distribución por deporte</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="w-44 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.sportBreakdown} dataKey="value" nameKey="sport" cx="50%" cy="50%" outerRadius={70} innerRadius={45} paddingAngle={3} strokeWidth={0}>
                      {stats.sportBreakdown.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} reservas`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 w-full">
                {stats.sportBreakdown.map((s) => (
                  <div key={s.sport} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="font-medium truncate flex-1">{s.sport}</span>
                    <span className="font-bold">{s.percentage}%</span>
                    <span className="text-xs text-muted-foreground">({s.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Court breakdown */}
        {stats.courtBreakdown.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-4">🏟️ Distribución por cancha</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="w-44 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.courtBreakdown} dataKey="value" nameKey="court" cx="50%" cy="50%" outerRadius={70} innerRadius={45} paddingAngle={3} strokeWidth={0}>
                      {stats.courtBreakdown.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} reservas`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 w-full">
                {stats.courtBreakdown.map((c) => (
                  <div key={c.court} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="font-medium truncate flex-1">{c.court}</span>
                    <span className="font-bold">{c.percentage}%</span>
                    <span className="text-xs text-muted-foreground">({c.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Expense breakdown */}
        {stats.expenseBreakdown.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-destructive" /> Distribución de gastos</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="w-44 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.expenseBreakdown} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={70} innerRadius={45} paddingAngle={3} strokeWidth={0}>
                      {stats.expenseBreakdown.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 w-full">
                {stats.expenseBreakdown.map((e) => (
                  <div key={e.category} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                    <span className="font-medium truncate flex-1">{e.category}</span>
                    <span className="font-bold">{e.percentage}%</span>
                    <span className="text-xs text-muted-foreground">(${e.value.toLocaleString()})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
