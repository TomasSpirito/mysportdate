import AdminLayout from "@/components/layout/AdminLayout";
import { dailyStats, mockBookings } from "@/data/mock-data";
import { DollarSign, TrendingUp, CreditCard, AlertCircle } from "lucide-react";

const AdminCash = () => {
  const partialBookings = mockBookings.filter((b) => b.paymentStatus === "partial");

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Caja del Día</h1>
        <p className="text-sm text-muted-foreground">Resumen de recaudación • Hoy</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Recaudado total", value: dailyStats.totalRevenue, icon: DollarSign, color: "text-primary" },
          { label: "Señas cobradas", value: dailyStats.totalDeposits, icon: CreditCard, color: "text-primary" },
          { label: "Pagos pendientes", value: dailyStats.pendingPayments, icon: AlertCircle, color: "text-accent" },
          { label: "Reservas hoy", value: dailyStats.totalBookings, icon: TrendingUp, color: "text-info", isCurrency: false },
        ].map((card) => (
          <div key={card.label} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-extrabold">
              {card.isCurrency === false ? card.value : `$${card.value.toLocaleString()}`}
            </p>
          </div>
        ))}
      </div>

      {/* Pending payments */}
      <h2 className="font-bold text-lg mb-3">Pagos pendientes</h2>
      {partialBookings.length === 0 ? (
        <div className="text-center py-10 bg-muted/50 rounded-2xl">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm font-semibold">No hay pagos pendientes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {partialBookings.map((b) => (
            <div key={b.id} className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-sm">{b.userName}</p>
                <p className="text-xs text-muted-foreground">{b.courtName} • {b.startTime} - {b.endTime}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Resta</p>
                <p className="font-extrabold text-accent">${(b.totalPrice - b.depositAmount).toLocaleString()}</p>
              </div>
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
                Cobrar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* All today's transactions */}
      <h2 className="font-bold text-lg mt-8 mb-3">Movimientos de hoy</h2>
      <div className="space-y-2">
        {mockBookings.map((b) => (
          <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 text-sm">
            <div className={`w-2 h-2 rounded-full ${b.paymentStatus === "full" ? "bg-primary" : b.paymentStatus === "partial" ? "bg-accent" : "bg-destructive"}`} />
            <span className="flex-1 font-medium">{b.userName}</span>
            <span className="text-muted-foreground">{b.startTime}</span>
            <span className="font-bold">${b.depositAmount.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminCash;
