import AdminLayout from "@/components/layout/AdminLayout";
import { useBookingsRange, useCourts, useSports, useExpensesRange, useFacilitySchedules, useBuffetSalesRange, useHolidays } from "@/hooks/use-supabase-data";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, endOfMonth, addMonths, getDay, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid, LineChart, Line } from "recharts";
import { ChevronLeft, ChevronRight, TrendingDown, Users, Coffee, AlertCircle, Wallet, Smartphone, Target, XCircle, BarChart3, Search, Download, CalendarCheck, MapPin, Dribbble, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react"; 

const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HEAT_HOURS = Array.from({ length: 6 }, (_, i) => i + 18);

const sportColors = ["#10b981", "#f97316", "#0ea5e9", "#e11d48", "#8b5cf6", "#eab308"];
const courtColors = ["#10b981", "#f97316", "#0ea5e9", "#e11d48", "#8b5cf6", "#eab308", "#14b8a6", "#f59e0b"];
const expenseColors = ["#ef4444", "#f97316", "#eab308", "#e11d48", "#8b5cf6", "#0ea5e9"];
const paymentColors = { efectivo: "#00a650", mercadopago: "#009EE3", tarjeta: "#a855f7" };
const originColors = { online: "#0ea5e9", manual: "#f97316", fixed: "#8b5cf6" };

const expenseCatLabels: Record<string, string> = {
  luz: "Luz", agua: "Agua", gas: "Gas", internet: "Internet", alquiler: "Alquiler",
  mantenimiento: "Mant.", limpieza: "Limpieza", proveedores: "Prov.", sueldos: "Sueldos",
  impuestos: "Impuestos", seguros: "Seguros", marketing: "Marketing", equipamiento: "Equip.", otro: "Otro",
  buffet_insumos: "Mercadería"
};

const AdminAnalytics = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const monthStartStr = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const monthEndStr = format(endOfMonth(selectedDate), "yyyy-MM-dd");
  const { toast } = useToast(); 

  const { data: bookings = [] } = useBookingsRange(monthStartStr, monthEndStr);
  const { data: expenses = [] } = useExpensesRange(monthStartStr, monthEndStr);
  const { data: courts = [] } = useCourts();
  const { data: sports = [] } = useSports();
  const { data: schedules = [] } = useFacilitySchedules();
  const { data: buffetSales = [] } = useBuffetSalesRange(monthStartStr, monthEndStr);
  const { data: holidays = [] } = useHolidays(); // <-- NUEVO: Traemos feriados

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const daysInMonth = endOfMonth(selectedDate).getDate();

    // 1. KPIs FINANCIEROS Y OCUPACIÓN
    let totalSlots = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d);
      const dayIdx = (getDay(date) + 6) % 7;
      const sched = schedules.find((s) => s.day_of_week === dayIdx);
      if (sched && sched.is_open) {
        const openH = parseInt(sched.open_time.split(":")[0]);
        const closeH = parseInt(sched.close_time.split(":")[0]);
        totalSlots += courts.length * ((closeH <= openH ? closeH + 24 : closeH) - openH);
      }
    }
    const occupancyRate = totalSlots > 0 ? Math.round((totalBookings / totalSlots) * 100) : 0;

    const totalRevenue = bookings.reduce((s, b) => s + b.total_price, 0);
    
    // --- LÓGICA NUEVA PARA EVENTOS ---
    const eventBookings = bookings.filter(b => courts.find(c => c.id === b.court_id)?.is_event);
    const eventRevenue = eventBookings.reduce((s, b) => s + b.total_price, 0);
    const sportRevenue = totalRevenue - eventRevenue;

    const revenueTypeBreakdown = [
        { name: "Deportes", value: sportRevenue, color: "#10b981", pct: totalRevenue > 0 ? Math.round((sportRevenue/totalRevenue)*100) : 0 },
        { name: "Eventos", value: eventRevenue, color: "#8b5cf6", pct: totalRevenue > 0 ? Math.round((eventRevenue/totalRevenue)*100) : 0 }
    ].filter(r => r.value > 0).sort((a,b) => b.value - a.value);
    // ---------------------------------

    const totalDeposits = bookings.reduce((s, b) => s + b.deposit_amount, 0);
    const pendingPayments = totalRevenue - totalDeposits;
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const buffetTotal = buffetSales.reduce((s, sale) => s + sale.total, 0);
    const netProfit = totalDeposits + buffetTotal - totalExpenses;
    const avgTicket = totalBookings > 0 ? Math.round((totalRevenue + buffetTotal) / totalBookings) : 0;

    // 2. DESGLOSES CATEGÓRICOS
    const pmMap: Record<string, number> = { efectivo: 0, mercadopago: 0, tarjeta: 0 };
    bookings.forEach(b => { 
        const pm = (b as any).payment_method;
        if (pm && b.deposit_amount > 0) pmMap[pm] = (pmMap[pm] || 0) + b.deposit_amount; 
    });
    buffetSales.forEach(s => { const pm = (s as any).payment_method; if (pm) pmMap[pm] = (pmMap[pm] || 0) + s.total; });
    const totalCollected = totalDeposits + buffetTotal;
    const paymentBreakdown = [
        { name: "Efectivo", value: pmMap.efectivo, color: paymentColors.efectivo, pct: totalCollected > 0 ? Math.round((pmMap.efectivo / totalCollected) * 100) : 0 },
        { name: "Mercado Pago", value: pmMap.mercadopago, color: paymentColors.mercadopago, pct: totalCollected > 0 ? Math.round((pmMap.mercadopago / totalCollected) * 100) : 0 },
        { name: "Tarjeta", value: pmMap.tarjeta, color: paymentColors.tarjeta, pct: totalCollected > 0 ? Math.round((pmMap.tarjeta / totalCollected) * 100) : 0 }
    ].filter(p => p.value > 0).sort((a, b) => b.value - a.value);

    const originMap: Record<string, number> = { online: 0, manual: 0, fixed: 0 };
    bookings.forEach(b => { originMap[b.booking_type] = (originMap[b.booking_type] || 0) + 1; });
    const originBreakdown = [
        { name: "App (Online)", value: originMap.online, color: originColors.online, pct: totalBookings > 0 ? Math.round((originMap.online / totalBookings) * 100) : 0 },
        { name: "Admin (Manual)", value: originMap.manual, color: originColors.manual, pct: totalBookings > 0 ? Math.round((originMap.manual / totalBookings) * 100) : 0 },
        { name: "Turno Fijo", value: originMap.fixed, color: originColors.fixed, pct: totalBookings > 0 ? Math.round((originMap.fixed / totalBookings) * 100) : 0 }
    ].filter(o => o.value > 0).sort((a, b) => b.value - a.value);

    const sportCounts: Record<string, number> = {};
    const courtCounts: Record<string, number> = {};
    const courtRevenue: Record<string, number> = {}; 
    
    bookings.forEach((b) => {
      const court = courts.find((c) => c.id === b.court_id);
      if (court) sportCounts[court.sport_id] = (sportCounts[court.sport_id] || 0) + 1;
      courtCounts[b.court_id] = (courtCounts[b.court_id] || 0) + 1;
      courtRevenue[b.court_id] = (courtRevenue[b.court_id] || 0) + b.total_price;
    });

    const sportBreakdown = sports.map((s, i) => ({ sport: s.name, value: sportCounts[s.id] || 0, percentage: totalBookings > 0 ? Math.round(((sportCounts[s.id] || 0) / totalBookings) * 100) : 0, color: sportColors[i % sportColors.length] })).filter(s => s.value > 0);
    const courtBreakdown = courts.map((c, i) => ({ court: c.name, value: courtCounts[c.id] || 0, percentage: totalBookings > 0 ? Math.round(((courtCounts[c.id] || 0) / totalBookings) * 100) : 0, color: courtColors[i % courtColors.length] })).filter(c => c.value > 0).sort((a,b) => b.value - a.value);

    const courtProfitability = courts.map(c => ({
        name: c.name,
        sport: sports.find(s => s.id === c.sport_id)?.name || (c.is_event ? "Eventos" : ""),
        revenue: courtRevenue[c.id] || 0,
        color: c.is_event ? "#8b5cf6" : sportColors[sports.findIndex(s => s.id === c.sport_id) % sportColors.length]
    })).sort((a,b) => b.revenue - a.revenue).slice(0, 10); 

    // 3. HEATMAP Y TEMPORALES
    const heatmap: Record<string, number> = {};
    bookings.forEach((b) => {
      const d = new Date(b.start_time);
      const dayIdx = (getDay(d) + 6) % 7;
      const hour = d.getUTCHours();
      if (hour >= 18 && hour <= 23) {
        heatmap[`${dayIdx}-${hour}`] = (heatmap[`${dayIdx}-${hour}`] || 0) + 1;
      }
    });
    const heatmapMax = Math.max(...Object.values(heatmap), 1);

    const monthlyFlow: any[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d);
      const dayStr = format(date, "yyyy-MM-dd");
      
      const dayBookings = bookings.filter((b) => b.start_time.startsWith(dayStr));
      const dayBuffet = buffetSales.filter((s) => s.created_at.startsWith(dayStr));
      const dayExpenses = expenses.filter((e) => e.expense_date.startsWith(dayStr));
      
      const ingresosDia = dayBookings.reduce((s, b) => s + b.deposit_amount, 0) + dayBuffet.reduce((sum, s) => sum + s.total, 0);
      const egresosDia = dayExpenses.reduce((s, e) => s + e.amount, 0);
      
      monthlyFlow.push({ day: format(date, "d MMM", { locale: es }), dNum: d, Ingresos: ingresosDia, Egresos: egresosDia });
    }

    const weeklyOccupancy: Record<number, number> = {};
    const totalSlotsPerWeek: Record<number, number> = {};
    
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d);
        const dayIdx = (getDay(date) + 6) % 7;
        const weekNum = Math.ceil(d / 7);
        
        const sched = schedules.find((s) => s.day_of_week === dayIdx);
        if (sched && sched.is_open) {
            const openH = parseInt(sched.open_time.split(":")[0]);
            const closeH = parseInt(sched.close_time.split(":")[0]);
            totalSlotsPerWeek[weekNum] = (totalSlotsPerWeek[weekNum] || 0) + courts.length * ((closeH <= openH ? closeH + 24 : closeH) - openH);
        }
    }

    bookings.forEach(b => {
        const d = new Date(b.start_time).getDate();
        const weekNum = Math.ceil(d / 7);
        weeklyOccupancy[weekNum] = (weeklyOccupancy[weekNum] || 0) + 1;
    });

    const maxWeeks = Math.ceil(daysInMonth / 7);
    const occupancyTrend: any[] = [];
    for(let w=1; w <= maxWeeks; w++) {
        const slots = totalSlotsPerWeek[w] || 0;
        const turnos = weeklyOccupancy[w] || 0;
        const pct = slots > 0 ? Math.round((turnos / slots) * 100) : 0;
        occupancyTrend.push({ week: `Semana ${w}`, Ocupación: pct });
    }

    // 4. GASTOS Y CLIENTES
    const expCats: Record<string, number> = {};
    expenses.forEach((e) => { expCats[e.category] = (expCats[e.category] || 0) + e.amount; });
    const expenseBreakdown = Object.entries(expCats).map(([cat, amount], i) => ({
      category: expenseCatLabels[cat] || cat, value: amount, percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0, color: expenseColors[i % expenseColors.length],
    })).sort((a, b) => b.value - a.value).filter(e => e.value > 0);

    const uniqueClients = new Set<string>();
    bookings.forEach((b) => {
      if (b.user_phone || b.user_name) {
        uniqueClients.add(b.user_phone || b.user_name || "anon");
      }
    });
    const totalClients = uniqueClients.size;

    const totalCancelled = bookings.filter((b) => b.status === "cancelled").length;
    const cancelRate = totalBookings > 0 ? Math.round((totalCancelled / totalBookings) * 100) : 0;

    // 5. ESTADO DE RESERVAS
    const statusMap = { played: 0, user_cancel: 0, club_cancel: 0 };
    bookings.forEach(b => {
        if (b.status !== 'cancelled') statusMap.played++;
        else if (b.cancellation_reason === 'club') statusMap.club_cancel++;
        else statusMap.user_cancel++;
    });
    const statusBreakdown = [
        { name: "Jugadas", value: statusMap.played, color: "#10b981", pct: totalBookings > 0 ? Math.round((statusMap.played / totalBookings) * 100) : 0 },
        { name: "Canc. Cliente", value: statusMap.user_cancel, color: "#ef4444", pct: totalBookings > 0 ? Math.round((statusMap.user_cancel / totalBookings) * 100) : 0 },
        { name: "Canc. Club", value: statusMap.club_cancel, color: "#f97316", pct: totalBookings > 0 ? Math.round((statusMap.club_cancel / totalBookings) * 100) : 0 }
    ].filter(s => s.value > 0).sort((a,b) => b.value - a.value);

    return { 
      totalBookings, occupancyRate, totalRevenue, pendingPayments, totalExpenses, netProfit, avgTicket, 
      sportBreakdown, courtBreakdown, heatmap, heatmapMax, monthlyFlow, expenseBreakdown, totalClients, 
      cancelRate, buffetTotal, paymentBreakdown, originBreakdown, courtProfitability, occupancyTrend, 
      statusBreakdown, sportRevenue, eventRevenue, revenueTypeBreakdown // <-- Agregados acá
    };
  }, [bookings, courts, sports, selectedDate, expenses, schedules, buffetSales, holidays]); // <-- Agregamos holidays al dep array

  const getHeatColor = (count: number, max: number) => {
    if (count === 0) return "bg-muted";
    const ratio = count / max;
    if (ratio < 0.33) return "bg-green-100 text-green-800 border border-green-200 shadow-sm";
    if (ratio < 0.66) return "bg-yellow-100 text-yellow-800 border border-green-300 shadow-sm";
    return "bg-red-500 text-white shadow-md";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
              <div className="bg-card p-3 rounded-xl shadow-xl border border-border">
                  <p className="font-bold text-sm mb-2 capitalize">{label}</p>
                  {payload.map((p: any) => (
                      <div key={p.name} className="flex justify-between items-center gap-4 text-sm mb-1 last:mb-0">
                          <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} /> {p.name}:
                          </span>
                          <span className="font-black" style={{ color: p.color }}>
                            {p.name === "Ocupación" ? `${p.value}%` : `$${p.value.toLocaleString()}`}
                          </span>
                      </div>
                  ))}
              </div>
          );
      }
      return null;
  };

  const handleExportReport = () => {
      const wb = XLSX.utils.book_new();

      const kpis = [
        { Metrica: "Ocupación Promedio", Valor: `${stats.occupancyRate}%` },
        { Metrica: "Total Reservas", Valor: stats.totalBookings },
        { Metrica: "Ingresos Canchas", Valor: stats.sportRevenue },
        { Metrica: "Ingresos Eventos", Valor: stats.eventRevenue },
        { Metrica: "Ingresos Buffet", Valor: stats.buffetTotal },
        { Metrica: "Egresos Totales", Valor: stats.totalExpenses },
        { Metrica: "Ganancia Neta", Valor: stats.netProfit },
        { Metrica: "Ticket Promedio", Valor: stats.avgTicket },
        { Metrica: "Clientes Únicos", Valor: stats.totalClients },
        { Metrica: "Tasa de Cancelación", Valor: `${stats.cancelRate}%` }
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis), "KPIs Mensuales");

      const pagosData = stats.paymentBreakdown.map(p => ({
          Medio_de_Cobro: p.name,
          Monto_Recaudado: p.value,
          Porcentaje: `${p.pct}%`
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pagosData), "Medios de Cobro");

      const periodName = format(selectedDate, "MMMM_yyyy", { locale: es });
      XLSX.writeFile(wb, `Reporte_Gerencial_${periodName}.xlsx`);
      toast({ title: "Reporte descargado con éxito 📊" });
  };

  const handleExportPDF = async () => {
      const element = document.getElementById('pdf-content');
      if (!element) return;

      setIsExportingPDF(true);
      toast({ title: "Generando PDF, aguardá unos segundos... 📸" });

      try {
          const canvas = await html2canvas(element, {
              scale: 2, 
              useCORS: true, 
              backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
              orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
              unit: 'px',
              format: [canvas.width, canvas.height]
          });

          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          const periodName = format(selectedDate, "MMMM_yyyy", { locale: es });
          pdf.save(`Reporte_Visual_${periodName}.pdf`);
          toast({ title: "PDF descargado con éxito 📄" });
      } catch (error) {
          console.error(error);
          toast({ title: "Error al generar PDF", variant: "destructive" });
      } finally {
          setIsExportingPDF(false);
      }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Analíticas</h1>
            <p className="text-sm text-muted-foreground">Rendimiento, control financiero y toma de decisiones</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleExportReport} className="flex items-center justify-center gap-2 bg-[#107c41] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0e6e39] transition-colors shadow-sm">
                <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={handleExportPDF} disabled={isExportingPDF} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50">
                {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} 
                {isExportingPDF ? "Generando..." : "Descargar PDF"}
            </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => setSelectedDate(addMonths(selectedDate, -1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
        <span className="font-bold capitalize min-w-[140px] text-center">{format(selectedDate, "MMMM yyyy", { locale: es })}</span>
        <button onClick={() => setSelectedDate(addMonths(selectedDate, 1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => setSelectedDate(new Date())} className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-bold hover:opacity-90 transition-opacity ml-auto shadow-sm">Mes Actual</button>
      </div>

      <div id="pdf-content" className="bg-background pb-4">

      {/* FILA 1: KPIs FINANCIEROS Y EVENTOS */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 mb-4">
        <div className="glass-card rounded-2xl p-4 sm:p-5 border-l-4 border-l-info">
          <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider leading-relaxed">Ocupación</p>
          <p className="text-2xl sm:text-3xl font-black text-info leading-relaxed py-0.5">{stats.occupancyRate}%</p>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5 border-l-4 border-l-foreground">
          <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider leading-relaxed">Reservas</p>
          <p className="text-2xl sm:text-3xl font-black text-foreground leading-relaxed py-0.5">{stats.totalBookings}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5 border-l-4 border-l-primary">
          <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider leading-relaxed">Ingr. Deportes</p>
          <p className="text-2xl sm:text-3xl font-black text-primary leading-relaxed py-0.5" title={`$${stats.sportRevenue.toLocaleString()}`}>${(stats.sportRevenue / 1000).toFixed(0)}k</p>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5 border-l-4 border-l-purple-500">
          <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider leading-relaxed">Ingr. Eventos</p>
          <p className="text-2xl sm:text-3xl font-black text-purple-500 leading-relaxed py-0.5" title={`$${stats.eventRevenue.toLocaleString()}`}>${(stats.eventRevenue / 1000).toFixed(0)}k</p>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5 border-l-4 border-l-orange-500">
          <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider leading-relaxed">Buffet</p>
          <p className="text-2xl sm:text-3xl font-black text-orange-500 leading-relaxed py-0.5" title={`$${stats.buffetTotal.toLocaleString()}`}>${(stats.buffetTotal / 1000).toFixed(0)}k</p>
        </div>
        <div className="glass-card rounded-2xl p-4 sm:p-5 border-l-4 border-l-destructive">
          <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider leading-relaxed">Egresos</p>
          <p className="text-2xl sm:text-3xl font-black text-destructive leading-relaxed py-0.5" title={`$${stats.totalExpenses.toLocaleString()}`}>-${(stats.totalExpenses / 1000).toFixed(0)}k</p>
        </div>
        <div className={cn("glass-card rounded-2xl p-4 sm:p-5 border-l-4", stats.netProfit >= 0 ? "border-l-[#00a650]" : "border-l-destructive")}>
          <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider leading-relaxed">Ganancia Neta</p>
          <p className={cn("text-2xl sm:text-3xl font-black leading-relaxed py-0.5", stats.netProfit >= 0 ? "text-[#00a650]" : "text-destructive")} title={`$${stats.netProfit.toLocaleString()}`}>
              ${(stats.netProfit / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* FILA 2: KPIs de Negocio & Clientes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-border/50 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0"><AlertCircle className="w-5 h-5 text-orange-500" /></div>
          <div className="flex-1 overflow-visible">
            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed pb-0.5">Deuda en la calle</p>
            <p className="text-xl font-black text-orange-500 leading-relaxed pt-0.5">${stats.pendingPayments.toLocaleString()}</p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-border/50 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Target className="w-5 h-5 text-primary" /></div>
          <div className="flex-1 overflow-visible">
            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed pb-0.5">Ticket Promedio</p>
            <p className="text-xl font-black text-primary leading-relaxed pt-0.5">${stats.avgTicket.toLocaleString()}</p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-border/50 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-info" /></div>
          <div className="flex-1 overflow-visible">
            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed pb-0.5">Clientes Únicos</p>
            <p className="text-xl font-black text-info leading-relaxed pt-0.5">{stats.totalClients}</p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-border/50 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"><XCircle className="w-5 h-5 text-destructive" /></div>
          <div className="flex-1 overflow-visible">
            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed pb-0.5">Tasa Cancelación</p>
            <p className="text-xl font-black text-destructive leading-relaxed pt-0.5">{stats.cancelRate}%</p>
          </div>
        </div>
      </div>

      {/* FILA 3: GRÁFICO PRINCIPAL FULL WIDTH (HÉROE) */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-md mb-8 border border-border/80">
        <h3 className="font-bold text-base mb-6 flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Flujo Financiero Mensual (Cobrado vs Gastado)</h3>
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.monthlyFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00a650" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00a650" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="dNum" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} dy={10} minTickGap={15} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}/>
              <Area isAnimationActive={!isExportingPDF} type="monotone" dataKey="Ingresos" stroke="#00a650" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" activeDot={{ r: 6, strokeWidth: 0 }} />
              <Area isAnimationActive={!isExportingPDF} type="monotone" dataKey="Egresos" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorEgresos)" activeDot={{ r: 6, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FILA 4: GRÁFICOS DE VALOR AGREGADO POR CATEGORÍA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Top 10 Canchas Rentables */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-sm">
            <h3 className="font-bold text-base mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Top 10 Espacios Rentables</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.courtProfitability} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                        <XAxis type="number" tickFormatter={(v) => `$${v/1000}k`} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" tick={{fontSize: 10, fontWeight: 600}} axisLine={false} tickLine={false} width={80} />
                        <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Ingreso Total"]} contentStyle={{borderRadius: '12px', fontWeight: 'bold'}} />
                        <Bar isAnimationActive={!isExportingPDF} dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 5, 5, 0]}>
                            {stats.courtProfitability.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Evolución de Ocupación Semanal */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col">
            <h3 className="font-bold text-base mb-6">📈 Evolución de Ocupación por Semana</h3>
            <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.occupancyTrend} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="week" tick={{fontSize: 11, fontWeight: 600}} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tickFormatter={(v) => `${v}%`} tick={{fontSize: 10}} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line isAnimationActive={!isExportingPDF} type="monotone" dataKey="Ocupación" stroke="hsl(var(--primary))" strokeWidth={4} dot={{r: 6, strokeWidth: 0, fill: "hsl(var(--primary))"}} activeDot={{r: 8, strokeWidth: 0}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-auto text-center p-3 bg-muted/50 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground leading-relaxed">Ocupación Promedio Mes</p>
                <p className="text-xl font-black text-primary leading-relaxed">{stats.occupancyRate}%</p>
            </div>
        </div>
      </div>

      {/* FILA 5: HEATMAP FULL WIDTH */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-sm mb-8">
        <h3 className="font-bold text-base mb-6">🔥 Mapa de Calor (Horarios Pico)</h3>
        <div className="overflow-x-auto custom-scrollbar pb-2 pr-1">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="w-20"></th>
                {DAYS_SHORT.map((d) => (<th key={d} className="text-xs text-muted-foreground pb-4 font-bold uppercase text-center">{d}</th>))}
              </tr>
            </thead>
            <tbody>
              {HEAT_HOURS.map((hour) => (
                <tr key={hour}>
                  <td className="text-xs font-mono text-muted-foreground py-2 pr-4 font-bold text-right border-r border-border/50">{hour}:00</td>
                  {DAYS_SHORT.map((_, dayIdx) => {
                    const count = stats.heatmap[`${dayIdx}-${hour}`] || 0;
                    
                    // NUEVO: Verificamos si este día puntual es feriado en este mes (Lógica aproximada visual)
                    // Buscamos cualquier feriado que caiga en este día de la semana para este mes
                    const isHoliday = holidays.some(h => {
                        const d = new Date(h.date + "T12:00:00");
                        return d.getMonth() === selectedDate.getMonth() && (getDay(d) + 6) % 7 === dayIdx;
                    });

                    return (
                      <td key={dayIdx} className="p-1 px-1.5 relative">
                        {isHoliday && count > 0 && <span className="absolute top-1 right-2 text-[8px]" title="Feriado">⭐</span>}
                        <div className={cn("w-full h-11 rounded-lg flex items-center justify-center text-[11px] font-black transition-all hover:scale-110", getHeatColor(count, stats.heatmapMax))} title={`${count} reservas`}>
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
        <div className="flex items-center gap-4 mt-4 p-3 bg-muted/50 rounded-xl border border-border/50 w-fit mx-auto text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-muted border border-border"/> 0 turnos</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-100 text-green-800"/> Baja</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-100 text-yellow-800"/> Media</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500"/> Alta</div>
            <div className="flex items-center gap-1 ml-4">⭐ Feriado</div>
        </div>
      </div>

      {/* FILA 6: LOS GRÁFICOS CATEGÓRICOS AGRUPADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* NUEVO: Eventos vs Deportes */}
        {stats.revenueTypeBreakdown.length > 0 && (
          <div className="glass-card rounded-2xl p-5 flex flex-col hover:border-border/80 transition-colors shadow-sm">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><PartyPopper className="w-4 h-4 text-primary" /> Deportes vs Eventos</h3>
            <div className="h-40 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={!isExportingPDF} data={stats.revenueTypeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={2} stroke="var(--background)">
                    {stats.revenueTypeBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 mt-auto">
              {stats.revenueTypeBreakdown.map((pm) => (
                <div key={pm.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 pr-2"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pm.color }} /><span className="font-semibold leading-relaxed py-0.5">{pm.name}</span></div>
                  <div className="flex gap-2 shrink-0 items-center"><span className="font-black text-muted-foreground leading-relaxed">{pm.pct}%</span><span className="font-black w-10 text-right leading-relaxed">${(pm.value/1000).toFixed(1)}k</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Origen Reservas */}
        {stats.originBreakdown.length > 0 && (
          <div className="glass-card rounded-2xl p-5 flex flex-col hover:border-border/80 transition-colors shadow-sm">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Smartphone className="w-4 h-4 text-primary" /> Origen Reservas</h3>
            <div className="h-40 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={!isExportingPDF} data={stats.originBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={2} stroke="var(--background)">
                    {stats.originBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} turnos`} contentStyle={{ borderRadius: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 mt-auto">
              {stats.originBreakdown.map((pm) => (
                <div key={pm.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 pr-2"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pm.color }} /><span className="font-semibold leading-relaxed py-0.5">{pm.name}</span></div>
                  <div className="flex gap-2 shrink-0 items-center"><span className="font-black text-muted-foreground leading-relaxed">{pm.pct}%</span><span className="font-black w-8 text-right leading-relaxed">{pm.value}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medios de Cobro */}
        {stats.paymentBreakdown.length > 0 && (
          <div className="glass-card rounded-2xl p-5 flex flex-col hover:border-border/80 transition-colors shadow-sm">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Medios de Cobro</h3>
            <div className="h-40 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={!isExportingPDF} data={stats.paymentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={2} stroke="var(--background)">
                    {stats.paymentBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 mt-auto">
              {stats.paymentBreakdown.map((pm) => (
                <div key={pm.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 pr-2"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pm.color }} /><span className="font-semibold leading-relaxed py-0.5">{pm.name}</span></div>
                  <div className="flex gap-2 shrink-0 items-center"><span className="font-black text-muted-foreground leading-relaxed">{pm.pct}%</span><span className="font-black w-12 text-right leading-relaxed">${(pm.value/1000).toFixed(1)}k</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado de Reservas */}
        {stats.statusBreakdown.length > 0 && (
          <div className="glass-card rounded-2xl p-5 flex flex-col hover:border-border/80 transition-colors shadow-sm">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-primary" /> Estado Reservas</h3>
            <div className="h-40 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={!isExportingPDF} data={stats.statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={2} stroke="var(--background)">
                    {stats.statusBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} turnos`} contentStyle={{ borderRadius: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 mt-auto">
              {stats.statusBreakdown.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 pr-2"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} /><span className="font-semibold leading-relaxed py-0.5">{s.name}</span></div>
                  <div className="flex gap-2 shrink-0 items-center"><span className="font-black text-muted-foreground leading-relaxed">{s.pct}%</span><span className="font-black w-8 text-right leading-relaxed">{s.value}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Egresos */}
        {stats.expenseBreakdown.length > 0 && (
          <div className="glass-card rounded-2xl p-5 flex flex-col hover:border-border/80 transition-colors shadow-sm">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-destructive" /> Top Egresos</h3>
            <div className="h-40 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={!isExportingPDF} data={stats.expenseBreakdown} dataKey="value" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={2} stroke="var(--background)">
                    {stats.expenseBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 mt-auto">
              {stats.expenseBreakdown.slice(0, 3).map((e) => (
                <div key={e.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 pr-2"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: e.color }} /><span className="font-semibold leading-relaxed py-0.5">{e.category}</span></div>
                  <div className="flex gap-2 shrink-0 items-center"><span className="font-black text-muted-foreground leading-relaxed">{e.percentage}%</span><span className="font-black w-10 text-right leading-relaxed">${(e.value/1000).toFixed(1)}k</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      </div> 
    </AdminLayout>
  );
};

export default AdminAnalytics;