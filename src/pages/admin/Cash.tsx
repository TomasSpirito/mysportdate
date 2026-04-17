import { useState, useMemo } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
// IMPORTAMOS LOS HOOKS DE 'RANGE' PARA TRAER EL MES COMPLETO
import { useBookingsRange, useCourts, useUpdateBooking, useExpensesRange, useBuffetSalesRange } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { format, addDays, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { DollarSign, TrendingUp, CreditCard, AlertCircle, ChevronLeft, ChevronRight, Calendar, TrendingDown, Coffee, Download, Clock, CalendarCheck, Banknote, SmartphoneNfc, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo", icon: Banknote, activeClass: "bg-[#00a650]/10 border-[#00a650] text-[#00a650]", hoverClass: "hover:border-[#00a650]/50 hover:bg-[#00a650]/5" },
  { value: "mercadopago", label: "Mercado Pago", icon: SmartphoneNfc, activeClass: "bg-[#009EE3]/10 border-[#009EE3] text-[#009EE3]", hoverClass: "hover:border-[#009EE3]/50 hover:bg-[#009EE3]/5" },
  { value: "tarjeta", label: "Tarjeta", icon: CreditCard, activeClass: "bg-purple-500/10 border-purple-500 text-purple-600", hoverClass: "hover:border-purple-500/50 hover:bg-purple-500/5" },
];

const PaymentBadge = ({ method }: { method?: string }) => {
    if (!method) return null;
    const pm = PAYMENT_METHODS.find(p => p.value === method);
    if (!pm) return null;
    const Icon = pm.icon;
    return (
        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground mt-0.5">
            <Icon className="w-3 h-3" /> {pm.label}
        </div>
    );
};

const AdminCash = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "month">("day");

  const [collectModal, setCollectModal] = useState<{ id: string, amount: number, userName: string, method: string } | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  
  // CALCULAMOS EL INICIO Y FIN DE MES PARA TRAER TODO EL PAQUETE DE UNA VEZ
  const monthStartStr = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const monthEndStr = format(endOfMonth(selectedDate), "yyyy-MM-dd");
  
  // TRAEMOS TODA LA DATA DEL MES (Ignoramos el timezone gap del día a día de la BD)
  const { data: rawBookings = [] } = useBookingsRange(monthStartStr, monthEndStr);
  const { data: rawExpenses = [] } = useExpensesRange(monthStartStr, monthEndStr);
  const { data: rawBuffetSales = [] } = useBuffetSalesRange(monthStartStr, monthEndStr);
  
  const { data: courts = [] } = useCourts();
  const updateBooking = useUpdateBooking();

  const getCourtName = (id: string) => courts.find((c) => c.id === id)?.name || "";

  // FILTRAMOS 100% EN JAVASCRIPT USANDO LA HORA LOCAL DE LA COMPUTADORA
  const bookings = useMemo(() => {
      const filtered = viewMode === "day" 
        ? rawBookings.filter(b => format(new Date(b.start_time), "yyyy-MM-dd") === dateStr)
        : rawBookings;
      return filtered.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }, [rawBookings, viewMode, dateStr]);

  const expenses = useMemo(() => {
      const filtered = viewMode === "day" 
        ? rawExpenses.filter(e => {
            // Forzamos un T12:00:00 para evitar que una fecha simple '2026-04-16' baje al día 15 por GMT-3
            const dateString = e.expense_date.includes("T") ? e.expense_date : `${e.expense_date}T12:00:00`;
            return format(new Date(dateString), "yyyy-MM-dd") === dateStr;
          })
        : rawExpenses;
        
      return filtered.sort((a, b) => {
          const dateA = a.expense_date.includes("T") ? a.expense_date : `${a.expense_date}T12:00:00`;
          const dateB = b.expense_date.includes("T") ? b.expense_date : `${b.expense_date}T12:00:00`;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  }, [rawExpenses, viewMode, dateStr]);

  const buffetSales = useMemo(() => {
      const filtered = viewMode === "day" 
        ? rawBuffetSales.filter(s => format(new Date(s.created_at), "yyyy-MM-dd") === dateStr)
        : rawBuffetSales;
      return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rawBuffetSales, viewMode, dateStr]);

  const stats = useMemo(() => {
    const totalRevenue = bookings.reduce((s, b) => s + b.total_price, 0);
    const totalDeposits = bookings.reduce((s, b) => s + b.deposit_amount, 0);
    const pendingPayments = totalRevenue - totalDeposits;
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const buffetTotal = buffetSales.reduce((s, sale) => s + sale.total, 0);
    const netBalance = totalDeposits + buffetTotal - totalExpenses;
    return { totalBookings: bookings.length, totalRevenue, totalDeposits, pendingPayments, totalExpenses, netBalance, buffetTotal };
  }, [bookings, expenses, buffetSales]);

  const pendingBookings = bookings.filter((b) => b.payment_status === "partial" || b.payment_status === "none");

  const confirmCollect = async () => {
    if (!collectModal) return;
    try {
        await updateBooking.mutateAsync({ 
            id: collectModal.id, 
            payment_status: "full", 
            deposit_amount: bookings.find(b => b.id === collectModal.id)?.total_price || collectModal.amount,
            payment_method: collectModal.method 
        } as any);
        toast({ title: "Pago registrado en caja ✅" });
        setCollectModal(null);
    } catch (error) {
        toast({ title: "Error al registrar pago", variant: "destructive" });
    }
  };

  const prevDay = () => setSelectedDate(addDays(selectedDate, -1));
  const nextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const prevMonth = () => setSelectedDate(addMonths(selectedDate, -1));
  const nextMonth = () => setSelectedDate(addMonths(selectedDate, 1));

  const EXPENSE_CATEGORIES: Record<string, { label: string; icon: string }> = {
    buffet_insumos: { label: "Insumos de Buffet", icon: "🌭" },
    luz: { label: "Luz / Electricidad", icon: "💡" }, agua: { label: "Agua", icon: "💧" },
    gas: { label: "Gas", icon: "🔥" }, internet: { label: "Internet", icon: "📡" },
    alquiler: { label: "Alquiler", icon: "🏠" }, mantenimiento: { label: "Mantenimiento", icon: "🔧" },
    limpieza: { label: "Limpieza", icon: "🧹" }, proveedores: { label: "Proveedores", icon: "📦" },
    sueldos: { label: "Sueldos", icon: "👷" }, impuestos: { label: "Impuestos", icon: "📋" },
    seguros: { label: "Seguros", icon: "🛡️" }, marketing: { label: "Marketing", icon: "📣" },
    equipamiento: { label: "Equipamiento", icon: "🏐" }, otro: { label: "Otro", icon: "📝" },
  };

  const handleExportExcel = () => {
    if (bookings.length === 0 && expenses.length === 0 && buffetSales.length === 0) {
        toast({ title: "No hay datos para exportar en esta fecha", variant: "destructive" });
        return;
    }

    const wb = XLSX.utils.book_new();

    const summaryData = [
        { Concepto: "Ingresos Canchas (Total Generado)", Monto: stats.totalRevenue },
        { Concepto: "Ingresos Canchas (Efectivamente Cobrado)", Monto: stats.totalDeposits },
        { Concepto: "Pagos Pendientes a Cobrar", Monto: stats.pendingPayments },
        { Concepto: "Ingresos por Ventas de Buffet", Monto: stats.buffetTotal },
        { Concepto: "Egresos Totales (Gastos/Compras)", Monto: stats.totalExpenses },
        { Concepto: "BALANCE NETO (Caja Real)", Monto: stats.netBalance },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Resumen General");

    if (bookings.length > 0) {
        const canchasData = bookings.map(b => ({
            Fecha: format(new Date(b.start_time), "dd/MM/yyyy"),
            Horario: `${format(new Date(b.start_time), "HH:mm")} - ${format(new Date(b.end_time), "HH:mm")}`,
            Cancha: getCourtName(b.court_id) + (courts.find(c => c.id === b.court_id)?.is_event ? " (Evento)" : ""),
            Cliente: b.user_name || "Sin nombre",
            Tipo: b.booking_type === "online" ? "Online" : b.booking_type === "fixed" ? "Turno Fijo" : "Manual",
            Estado: b.payment_status === "full" ? "Pagado" : b.payment_status === "partial" ? "Pago Parcial" : "Debe Todo",
            Precio_Total: b.total_price,
            Dinero_Cobrado: b.deposit_amount,
            Deuda_Pendiente: b.total_price - b.deposit_amount,
            Metodo_Pago: b.payment_method || "No especificado"
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(canchasData), "Detalle Canchas");
    }

    if (buffetSales.length > 0) {
        const buffetData = buffetSales.map(s => ({
            Fecha: format(new Date(s.created_at), "dd/MM/yyyy"),
            Hora: format(new Date(s.created_at), "HH:mm"),
            Detalle: "Ticket de venta - Buffet",
            Total_Cobrado: s.total,
            Metodo_Pago: (s as any).payment_method || "No especificado"
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buffetData), "Ventas Buffet");
    }

    if (expenses.length > 0) {
        const gastosData = expenses.map(e => ({
            Fecha: format(new Date(e.expense_date.includes("T") ? e.expense_date : `${e.expense_date}T12:00:00`), "dd/MM/yyyy"),
            Categoría: EXPENSE_CATEGORIES[e.category]?.label || e.category,
            Descripción: e.description || "-",
            Monto_Gastado: e.amount,
            Metodo_Pago: (e as any).payment_method || "No especificado" 
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gastosData), "Egresos y Compras");
    }

    const periodName = viewMode === "day" ? format(selectedDate, "dd-MM-yyyy") : format(selectedDate, "MMMM-yyyy", { locale: es });
    XLSX.writeFile(wb, `Reporte_Caja_${periodName}.xlsx`);
    toast({ title: "Excel descargado con éxito 📊" });
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Caja</h1>
          <p className="text-sm text-muted-foreground">Control de recaudación, gastos y movimientos</p>
        </div>
        <button onClick={handleExportExcel} className="flex items-center justify-center gap-2 bg-[#107c41] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0e6e39] transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Reporte Excel
        </button>
      </div>

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

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: "Ingresos canchas", value: stats.totalRevenue, icon: DollarSign, color: "text-primary" },
          { label: "Cobrado real", value: stats.totalDeposits, icon: CreditCard, color: "text-primary" },
          { label: "Por cobrar", value: stats.pendingPayments, icon: AlertCircle, color: "text-accent" },
          { label: "Ventas Buffet", value: stats.buffetTotal, icon: Coffee, color: "text-primary" },
          { label: "Egresos", value: stats.totalExpenses, icon: TrendingDown, color: "text-destructive" },
          { label: "Balance neto", value: stats.netBalance, icon: TrendingUp, color: stats.netBalance >= 0 ? "text-primary" : "text-destructive" },
        ].map((card) => (
          <div key={card.label} className="glass-card rounded-2xl p-5 border-t-2 border-transparent hover:border-primary/20 transition-colors">
            <div className="flex items-center gap-2 mb-2"><card.icon className={`w-4 h-4 ${card.color}`} /><span className="text-xs font-medium text-muted-foreground">{card.label}</span></div>
            <p className={cn("text-xl font-extrabold", card.color)}>${card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* 1. PAGOS PENDIENTES */}
      {pendingBookings.length > 0 && (
        <>
          <h2 className="font-bold text-lg mb-3">Cobros pendientes</h2>
          <div className="space-y-2 mb-8">
            {pendingBookings.map((b) => {
              const pendingAmount = b.payment_status === "none" ? b.total_price : b.total_price - b.deposit_amount;
              return (
                <div key={b.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{b.user_name || "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                        {format(new Date(b.start_time), "d MMM, HH:mm", { locale: es })} hs • {getCourtName(b.court_id)}
                        {courts.find(c => c.id === b.court_id)?.is_event && " 🎉 (Evento)"}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1 shrink-0">
                    <p className="font-black text-orange-500 text-base">${pendingAmount.toLocaleString()}</p>
                    <button onClick={() => setCollectModal({ id: b.id, amount: pendingAmount, userName: b.user_name || "Sin nombre", method: "efectivo" })} 
                      className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
                      Cobrar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* 2. INGRESOS CANCHAS */}
      <h2 className="font-bold text-lg mb-3">Ingresos - Canchas</h2>
      {bookings.length === 0 ? (
        <div className="text-center py-6 bg-muted/30 border border-dashed border-border/50 rounded-2xl mb-6">
          <p className="text-sm font-semibold text-muted-foreground">No hay reservas registradas en este periodo</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {bookings.map((b) => (
            <div key={b.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{b.user_name || "Sin nombre"}</p>
                <p className="text-xs text-muted-foreground truncate">{format(new Date(b.start_time), "d MMM, HH:mm", { locale: es })} hs • {getCourtName(b.court_id)}</p>
                {/* TIPO DE RESERVA */}
                <span className={cn("px-2 py-0.5 mt-1 inline-block rounded-md text-[10px] font-bold mr-2",
                  courts.find(c => c.id === b.court_id)?.is_event ? "bg-purple-500/10 text-purple-600" :
                  b.booking_type === "online" ? "bg-primary/10 text-primary" : 
                  b.booking_type === "fixed" ? "bg-info/10 text-info" : "bg-destructive/10 text-destructive"
                )}>
                  {courts.find(c => c.id === b.court_id)?.is_event ? "🎉 Evento" : 
                  b.booking_type === "online" ? "App" : 
                  b.booking_type === "fixed" ? "Fijo" : "Manual"}
                </span>
              </div>
              <div className="text-right flex flex-col items-end shrink-0">
                <div className="flex items-center gap-2">
                  {b.payment_status === "partial" && <span className="text-[10px] text-orange-500 font-bold bg-orange-500/10 px-2 py-0.5 rounded-md hidden sm:block">Resta ${(b.total_price - b.deposit_amount).toLocaleString()}</span>}
                  <p className="font-black text-foreground text-base">${b.deposit_amount.toLocaleString()}</p>
                </div>
                {/* BADGE DEL MÉTODO DE PAGO */}
                <PaymentBadge method={b.payment_method} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. INGRESOS BUFFET */}
      <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
        <Coffee className="w-5 h-5 text-primary" /> Ingresos - Buffet
      </h2>
      {buffetSales.length === 0 ? (
        <div className="text-center py-6 bg-muted/30 border border-dashed border-border/50 rounded-2xl mb-6">
          <p className="text-sm font-semibold text-muted-foreground">Sin ventas de buffet en este periodo</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {buffetSales.map((sale) => (
            <div key={sale.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Coffee className="w-5 h-5"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">Ticket de Venta</p>
                <p className="text-xs text-muted-foreground truncate">{format(new Date(sale.created_at), "d MMM, HH:mm", { locale: es })} hs</p>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end">
                  <p className="font-black text-primary text-base">${sale.total.toLocaleString()}</p>
                  {/* BADGE DEL MÉTODO DE PAGO */}
                  <PaymentBadge method={(sale as any).payment_method} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. EGRESOS */}
      <h2 className="font-bold text-lg mb-3">Egresos</h2>
      {expenses.length === 0 ? (
        <div className="text-center py-6 bg-muted/30 border border-dashed border-border/50 rounded-2xl">
          <p className="text-sm font-semibold text-muted-foreground">No hay egresos registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => {
            const cat = EXPENSE_CATEGORIES[e.category] || { label: e.category, icon: "📝" };
            return (
              <div key={e.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-xl shrink-0">
                    {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{cat.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {format(new Date(e.expense_date.includes("T") ? e.expense_date : `${e.expense_date}T12:00:00`), "d MMM", { locale: es })} • {e.description || "Sin descripción"}
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end">
                    <p className="font-black text-destructive text-base">-${e.amount.toLocaleString()}</p>
                    {/* BADGE DEL MÉTODO DE PAGO */}
                    <PaymentBadge method={(e as any).payment_method} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA COBRAR PENDIENTES */}
      {collectModal && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setCollectModal(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-4">
              <h3 className="font-extrabold text-xl">Registrar Cobro</h3>
              <button onClick={() => setCollectModal(null)} className="p-2 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground mb-1">Saldo a cobrar de {collectModal.userName}</p>
                <p className="text-4xl font-black text-foreground">${collectModal.amount.toLocaleString()}</p>
            </div>

            <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground block">¿Cómo abona este saldo?</label>
                <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(pm => (
                        <button key={pm.value} onClick={() => setCollectModal({...collectModal, method: pm.value})} 
                            className={cn("flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all", 
                            collectModal.method === pm.value ? `${pm.activeClass} shadow-md scale-105` : `bg-card text-muted-foreground border-border ${pm.hoverClass}`)}>
                            <pm.icon className="w-5 h-5" />
                            <span className="text-[10px] text-center leading-tight">{pm.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            <button onClick={confirmCollect} disabled={updateBooking.isPending}
              className="w-full mt-6 bg-primary text-primary-foreground py-3.5 rounded-xl font-black text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md">
              {updateBooking.isPending ? "Procesando..." : "Confirmar Ingreso en Caja"}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCash;