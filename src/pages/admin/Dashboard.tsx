import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useCourts, useBookings, type Booking } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const hours = Array.from({ length: 16 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);

const AdminDashboard = () => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: courts = [] } = useCourts();
  const { data: bookings = [] } = useBookings(dateStr);

  const getBooking = (courtId: string, hour: string) =>
    bookings.find((b) => {
      const bHour = new Date(b.start_time).getUTCHours();
      return b.court_id === courtId && `${bHour.toString().padStart(2, "0")}:00` === hour;
    });

  const getCourtName = (courtId: string) => courts.find((c) => c.id === courtId)?.name || "";

  const getSlotStyle = (booking?: Booking) => {
    if (!booking) return "bg-slot-free border-slot-free-border hover:bg-primary/10 cursor-pointer";
    if (booking.booking_type === "fixed") return "bg-info text-info-foreground";
    if (booking.booking_type === "manual") return "bg-destructive text-destructive-foreground";
    if (booking.payment_status === "full") return "bg-primary text-primary-foreground";
    return "bg-slot-deposit text-slot-deposit-foreground";
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Vista de agenda diaria</p>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-bold capitalize">{format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}</span>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {[
          { label: "Libre", cls: "bg-slot-free border border-slot-free-border" },
          { label: "Seña pagada", cls: "bg-slot-deposit text-slot-deposit-foreground" },
          { label: "Pagado total", cls: "bg-primary text-primary-foreground" },
          { label: "Manual", cls: "bg-destructive text-destructive-foreground" },
          { label: "Fijo/Abonado", cls: "bg-info text-info-foreground" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={cn("w-4 h-4 rounded", item.cls)} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto border border-border rounded-2xl">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-muted">
              <th className="text-left text-xs font-semibold p-3 w-20">Hora</th>
              {courts.map((c) => (
                <th key={c.id} className="text-left text-xs font-semibold p-3">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour} className="border-t border-border">
                <td className="text-xs font-mono p-3 text-muted-foreground">{hour}</td>
                {courts.map((court) => {
                  const booking = getBooking(court.id, hour);
                  return (
                    <td key={court.id} className="p-1.5">
                      <button
                        onClick={() => booking && setSelectedBooking(booking)}
                        className={cn(
                          "w-full rounded-lg p-2 text-left text-[11px] transition-all min-h-[40px]",
                          getSlotStyle(booking)
                        )}
                      >
                        {booking && (
                          <>
                            <p className="font-semibold truncate">{booking.user_name}</p>
                            <p className="opacity-80">${booking.deposit_amount.toLocaleString()} / ${booking.total_price.toLocaleString()}</p>
                          </>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Booking detail modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedBooking(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg">Detalle de reserva</h3>
              <button onClick={() => setSelectedBooking(null)} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Jugador</span><span className="font-semibold">{selectedBooking.user_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cancha</span><span className="font-semibold">{getCourtName(selectedBooking.court_id)}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horario</span>
                <span className="font-semibold">
                  {format(new Date(selectedBooking.start_time), "HH:mm")} - {format(new Date(selectedBooking.end_time), "HH:mm")}
                </span>
              </div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-extrabold">${selectedBooking.total_price.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pagado</span><span className="font-semibold text-primary">${selectedBooking.deposit_amount.toLocaleString()}</span></div>
              {selectedBooking.total_price > selectedBooking.deposit_amount && (
                <div className="flex justify-between"><span className="text-muted-foreground">Resta</span><span className="font-semibold text-accent">${(selectedBooking.total_price - selectedBooking.deposit_amount).toLocaleString()}</span></div>
              )}
            </div>
            {selectedBooking.payment_status === "partial" && (
              <button className="w-full mt-5 bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                Cobrar resto en efectivo
              </button>
            )}
            <button className="w-full mt-2 border border-destructive text-destructive py-2.5 rounded-xl text-sm font-medium hover:bg-destructive/10 transition-colors">
              Cancelar reserva
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
