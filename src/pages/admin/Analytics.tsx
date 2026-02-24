import AdminLayout from "@/components/layout/AdminLayout";
import { dailyStats } from "@/data/mock-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const AdminAnalytics = () => {
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
          <p className="text-3xl font-extrabold text-primary">{dailyStats.occupancyRate}%</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Reservas hoy</p>
          <p className="text-3xl font-extrabold">{dailyStats.totalBookings}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Facturación semanal</p>
          <p className="text-3xl font-extrabold">${dailyStats.weeklyRevenue.reduce((s, d) => s + d.revenue, 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue by day */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">Facturación semanal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyStats.weeklyRevenue}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Facturación"]} />
              <Bar dataKey="revenue" fill="hsl(152, 76%, 36%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bookings by hour */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">Reservas por franja horaria</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyStats.bookingsByHour}>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(152, 76%, 36%)" strokeWidth={2} dot={{ fill: "hsl(152, 76%, 36%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sport breakdown */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-bold text-sm mb-4">Distribución por deporte</h3>
        <div className="flex items-center gap-8">
          <div className="w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dailyStats.sportBreakdown} dataKey="percentage" nameKey="sport" cx="50%" cy="50%" outerRadius={70} innerRadius={45}>
                  {dailyStats.sportBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {dailyStats.sportBreakdown.map((s) => (
              <div key={s.sport} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm font-medium">{s.sport}</span>
                <span className="text-sm font-bold ml-auto">{s.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
