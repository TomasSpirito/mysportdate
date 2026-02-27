import { useState, useMemo } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useBookings, useCourts, useUpdateBooking } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { format, addDays, addMonths, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { DollarSign, TrendingUp, CreditCard, AlertCircle, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminCash = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "month">("day");

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: bookings = [] } = useBookings(dateStr);
  const { data: courts = [] } = useCourts();
  const updateBooking = useUpdateBooking();

  const getCourtName = (id: string) => courts.find((c) => c.id === id)?.name || "";

  const stats = useMemo(() => {
    const totalRevenue = bookings.reduce((s, b) => s + b.total_price, 0);
    const totalDeposits = bookings.reduce((s, b) => s + b.deposit_amount, 0);
    const pendingPayments = totalRevenue - totalDeposits;
    return { totalBookings: bookings.length, totalRevenue, totalDeposits, pendingPayments };
  }, [bookings]);

  const pendingBookings = bookings.filter((b) => b.payment_status === "partial" || b.payment_status === "none");

  const handleCollect = async (id: string, totalPrice: number) => {
    await updateBooking.mutateAsync({ id, payment_status: "full", deposit_amount: totalPrice });
    toast({ title: "Pago registrado" });
  };

  const prevDay = () => setSelectedDate(addDays(selectedDate, -1));
  const nextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const prevMonth = () => setSelectedDate(addMonths(selectedDate, -1));
  const nextMonth = () => setSelectedDate(addMonths(selectedDate, 1));

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Caja</h1>
        <p className="text-sm text-muted-foreground">Control de recaudación y movimientos</p>
      </div>

      {/* View toggle + navigation */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          <button onClick={() => setViewMode("day")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", viewMode === "day" ? "bg-card shadow-sm" : "text-muted-foreground")}>Día</button>
          <button onClick={() => setViewMode("month")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", viewMode === "month" ? "bg-card shadow-sm" : "text-muted-foreground")}>Mes</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={viewMode === "day" ? prevDay : prevMonth} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-bold capitalize min-w-[200px] text-center">
            {viewMode === "day" ? format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es }) : format(selectedDate, "MMMM yyyy", { locale: es })}
          </span>
          <button onClick={viewMode === "day" ? nextDay : nextMonth} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setSelectedDate(new Date())} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity ml-auto">
          <Calendar className="w-3.5 h-3.5" /> Hoy
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Recaudado total", value: stats.totalRevenue, icon: DollarSign, color: "text-primary" },
          { label: "Señas cobradas", value: stats.totalDeposits, icon: CreditCard, color: "text-primary" },
          { label: "Pagos pendientes", value: stats.pendingPayments, icon: AlertCircle, color: "text-accent" },
          { label: "Reservas", value: stats.totalBookings, icon: TrendingUp, color: "text-info", isCurrency: false },
        ].map((card) => (
          <div key={card.label} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2"><card.icon className={`w-4 h-4 ${card.color}`} /><span className="text-xs text-muted-foreground">{card.label}</span></div>
            <p className="text-2xl font-extrabold">{card.isCurrency === false ? card.value : `$${card.value.toLocaleString()}`}</p>
          </div>
        ))}
      </div>

      {/* Pending payments */}
      {pendingBookings.length > 0 && (
        <>
          <h2 className="font-bold text-lg mb-3">Pagos pendientes</h2>
          <div className="space-y-2 mb-8">
            {pendingBookings.map((b) => (
              <div key={b.id} className="glass-card rounded-2xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{b.user_name}</p>
                  <p className="text-xs text-muted-foreground">{getCourtName(b.court_id)} • {format(new Date(b.start_time), "HH:mm")} - {format(new Date(b.end_time), "HH:mm")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{b.payment_status === "none" ? "No pagado" : "Resta"}</p>
                  <p className="font-extrabold text-accent">${(b.payment_status === "none" ? b.total_price : b.total_price - b.deposit_amount).toLocaleString()}</p>
                </div>
                <button onClick={() => handleCollect(b.id, b.total_price)} disabled={updateBooking.isPending}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                  Cobrar
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* All movements */}
      <h2 className="font-bold text-lg mb-3">Movimientos</h2>
      {bookings.length === 0 ? (
        <div className="text-center py-10 bg-muted/50 rounded-2xl">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm font-semibold">No hay movimientos para esta fecha</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <div key={b.id} className="glass-card rounded-xl p-4 flex items-center gap-3 text-sm">
              <div className={cn("w-2.5 h-2.5 rounded-full", b.payment_status === "full" ? "bg-primary" : b.payment_status === "partial" ? "bg-accent" : "bg-destructive")} />
              <div className="flex-1">
                <p className="font-medium">{b.user_name || "Sin nombre"}</p>
                <p className="text-xs text-muted-foreground">{getCourtName(b.court_id)} • {format(new Date(b.start_time), "HH:mm")} - {format(new Date(b.end_time), "HH:mm")}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">${b.deposit_amount.toLocaleString()}</p>
                {b.payment_status === "partial" && <p className="text-[10px] text-accent">Resta ${(b.total_price - b.deposit_amount).toLocaleString()}</p>}
              </div>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium",
                b.booking_type === "online" ? "bg-primary/10 text-primary" :
                b.booking_type === "fixed" ? "bg-info/10 text-info" :
                "bg-destructive/10 text-destructive"
              )}>
                {b.booking_type === "online" ? "Online" : b.booking_type === "fixed" ? "Fijo" : "Manual"}
              </span>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCash;
