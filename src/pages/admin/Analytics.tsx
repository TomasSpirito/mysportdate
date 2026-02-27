import AdminLayout from "@/components/layout/AdminLayout";
import { useBookingsRange, useCourts, useSports } from "@/hooks/use-supabase-data";
import { useMemo, useState } from "react";
import { format, subDays, startOfWeek, startOfMonth, endOfMonth, addMonths, addDays, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HEAT_HOURS = Array.from({ length: 6 }, (_, i) => i + 18); // 18-23
const sportColors = ["hsl(152, 76%, 36%)", "hsl(24, 95%, 53%)", "hsl(210, 100%, 52%)", "hsl(340, 80%, 50%)"];

const AdminAnalytics = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");
  const rangeStart = monthStart;
  const rangeEnd = monthEnd;
  const weekStart = format(subDays(selectedDate, 6), "yyyy-MM-dd");

  const { data: bookings = [] } = useBookingsRange(rangeStart, rangeEnd);
  const { data: weekBookings = [] } = useBookingsRange(weekStart, rangeEnd);
  const { data: courts = [] } = useCourts();
  const { data: sports = [] } = useSports();

  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const daysInMonth = endOfMonth(selectedDate).getDate();
    const totalSlots = courts.length * 16 * daysInMonth;
    const occupancyRate = totalSlots > 0 ? Math.round((totalBookings / totalSlots) * 100) : 0;
    const totalRevenue = bookings.reduce((s, b) => s + b.total_price, 0);

    // Sport breakdown for donut
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

    // Heatmap data: day-of-week (Mon-Sun) x hour (18-23)
    const heatmap: Record<string, number> = {};
    const heatmapTotal: Record<string, number> = {};
    bookings.forEach((b) => {
      const d = new Date(b.start_time);
      const dayIdx = (getDay(d) + 6) % 7; // Mon=0, Sun=6
      const hour = d.getUTCHours();
      if (hour >= 18 && hour <= 23) {
        const key = `${dayIdx}-${hour}`;
        heatmap[key] = (heatmap[key] || 0) + 1;
      }
    });
    // Normalize heatmap (max 4 weeks of data = ~4 per cell max)
    const heatmapMax = Math.max(...Object.values(heatmap), 1);

    // Cash flow last 7 days (stacked: cash vs digital)
    const cashFlow: { day: string; cash: number; digital: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(selectedDate, i);
      const dayStr = format(d, "yyyy-MM-dd");
      const dayBookings = weekBookings.filter((b) => b.start_time.startsWith(dayStr));
      const cash = dayBookings.filter((b) => b.booking_type === "manual" || b.payment_status === "none").reduce((s, b) => s + b.deposit_amount, 0);
      const digital = dayBookings.filter((b) => b.booking_type !== "manual" && b.payment_status !== "none").reduce((s, b) => s + b.deposit_amount, 0);
      cashFlow.push({ day: format(d, "EEE d", { locale: es }), cash, digital });
    }

    return { totalBookings, occupancyRate, totalRevenue, sportBreakdown, heatmap, heatmapMax, cashFlow };
  }, [bookings, weekBookings, courts, sports, selectedDate]);

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

      {/* Date nav */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setSelectedDate(addMonths(selectedDate, -1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
        <span className="font-bold capitalize">{format(selectedDate, "MMMM yyyy", { locale: es })}</span>
        <button onClick={() => setSelectedDate(addMonths(selectedDate, 1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => setSelectedDate(new Date())} className="text-xs text-primary font-semibold hover:underline ml-auto">Hoy</button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Ocupación promedio</p>
          <p className="text-3xl font-extrabold text-primary">{stats.occupancyRate}%</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Reservas del mes</p>
          <p className="text-3xl font-extrabold">{stats.totalBookings}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Facturación período</p>
          <p className="text-3xl font-extrabold">${stats.totalRevenue.toLocaleString()}</p>
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

        {/* Cash flow stacked bar */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">💰 Flujo de Caja (últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.cashFlow}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Bar dataKey="cash" stackId="a" fill="hsl(152, 76%, 36%)" name="Efectivo" radius={[0, 0, 0, 0]} />
              <Bar dataKey="digital" stackId="a" fill="hsl(210, 100%, 52%)" name="Digital" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(152, 76%, 36%)" }} /><span>Efectivo</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(210, 100%, 52%)" }} /><span>Digital</span></div>
          </div>
        </div>
      </div>

      {/* Sport breakdown donut */}
      {stats.sportBreakdown.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">⚽ Distribución por deporte</h3>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="w-52 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.sportBreakdown} dataKey="value" nameKey="sport" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3} strokeWidth={0}>
                    {stats.sportBreakdown.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} reservas`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {stats.sportBreakdown.map((s) => (
                <div key={s.sport} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-medium w-20">{s.sport}</span>
                  <span className="text-sm font-bold">{s.percentage}%</span>
                  <span className="text-xs text-muted-foreground">({s.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAnalytics;
