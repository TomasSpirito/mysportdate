import AdminLayout from "@/components/layout/AdminLayout";
import { useBookings, useCourts, useSports } from "@/hooks/use-supabase-data";
import { useMemo } from "react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const AdminAnalytics = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: bookings = [] } = useBookings(today);
  const { data: courts = [] } = useCourts();
  const { data: sports = [] } = useSports();

  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const totalSlots = courts.length * 16; // 16 hours per court
    const occupancyRate = totalSlots > 0 ? Math.round((totalBookings / totalSlots) * 100) : 0;

    // Bookings by hour
    const hourCounts: Record<string, number> = {};
    for (let h = 8; h <= 23; h++) {
      hourCounts[`${h.toString().padStart(2, "0")}:00`] = 0;
    }
    bookings.forEach((b) => {
      const h = new Date(b.start_time).getUTCHours();
      const key = `${h.toString().padStart(2, "0")}:00`;
      if (hourCounts[key] !== undefined) hourCounts[key]++;
    });
    const bookingsByHour = Object.entries(hourCounts).map(([hour, count]) => ({ hour, count }));

    // Sport breakdown
    const sportColors = ["hsl(152, 76%, 36%)", "hsl(24, 95%, 53%)", "hsl(210, 100%, 52%)", "hsl(340, 80%, 50%)"];
    const sportCounts: Record<string, number> = {};
    bookings.forEach((b) => {
      const court = courts.find((c) => c.id === b.court_id);
      if (court) sportCounts[court.sport_id] = (sportCounts[court.sport_id] || 0) + 1;
    });
    const sportBreakdown = sports.map((s, i) => ({
      sport: s.name,
      percentage: totalBookings > 0 ? Math.round(((sportCounts[s.id] || 0) / totalBookings) * 100) : 0,
      color: sportColors[i % sportColors.length],
    }));

    const totalRevenue = bookings.reduce((s, b) => s + b.total_price, 0);

    return { totalBookings, occupancyRate, bookingsByHour, sportBreakdown, totalRevenue };
  }, [bookings, courts, sports]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Analíticas</h1>
        <p className="text-sm text-muted-foreground">Estadísticas y rendimiento del predio</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Ocupación promedio</p>
          <p className="text-3xl font-extrabold text-primary">{stats.occupancyRate}%</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Reservas hoy</p>
          <p className="text-3xl font-extrabold">{stats.totalBookings}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Facturación del día</p>
          <p className="text-3xl font-extrabold">${stats.totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bookings by hour */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">Reservas por franja horaria</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.bookingsByHour}>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(152, 76%, 36%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bookings trend */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">Tendencia horaria</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.bookingsByHour}>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(152, 76%, 36%)" strokeWidth={2} dot={{ fill: "hsl(152, 76%, 36%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sport breakdown */}
      {stats.sportBreakdown.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">Distribución por deporte</h3>
          <div className="flex items-center gap-8">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.sportBreakdown} dataKey="percentage" nameKey="sport" cx="50%" cy="50%" outerRadius={70} innerRadius={45}>
                    {stats.sportBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {stats.sportBreakdown.map((s) => (
                <div key={s.sport} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-medium">{s.sport}</span>
                  <span className="text-sm font-bold ml-auto">{s.percentage}%</span>
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
