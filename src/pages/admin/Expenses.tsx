import { useState, useMemo } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useExpenses, useCreateExpense, useDeleteExpense } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { format, addDays, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Trash2, ChevronLeft, ChevronRight, Calendar, X, Receipt } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const EXPENSE_CATEGORIES = [
  { value: "luz", label: "Luz / Electricidad", icon: "💡" },
  { value: "agua", label: "Agua", icon: "💧" },
  { value: "gas", label: "Gas", icon: "🔥" },
  { value: "internet", label: "Internet / Cable", icon: "📡" },
  { value: "alquiler", label: "Alquiler", icon: "🏠" },
  { value: "mantenimiento", label: "Mantenimiento", icon: "🔧" },
  { value: "limpieza", label: "Limpieza", icon: "🧹" },
  { value: "proveedores", label: "Proveedores", icon: "📦" },
  { value: "sueldos", label: "Sueldos / Personal", icon: "👷" },
  { value: "impuestos", label: "Impuestos", icon: "📋" },
  { value: "seguros", label: "Seguros", icon: "🛡️" },
  { value: "marketing", label: "Marketing / Publicidad", icon: "📣" },
  { value: "equipamiento", label: "Equipamiento", icon: "🏐" },
  { value: "otro", label: "Otro", icon: "📝" },
];

const AdminExpenses = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: "luz", description: "", amount: "", expense_date: format(new Date(), "yyyy-MM-dd") });

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: expenses = [] } = useExpenses(viewMode === "day" ? dateStr : undefined);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const filteredExpenses = useMemo(() => {
    if (viewMode === "day") return expenses;
    const monthStr = format(selectedDate, "yyyy-MM");
    return expenses.filter((e) => e.expense_date.startsWith(monthStr));
  }, [expenses, selectedDate, viewMode]);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const getCategoryInfo = (cat: string) => EXPENSE_CATEGORIES.find((c) => c.value === cat) || { label: cat, icon: "📝" };

  const handleCreate = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: "Ingresá un monto válido", variant: "destructive" });
      return;
    }
    try {
      await createExpense.mutateAsync({ category: form.category, description: form.description || undefined, amount: Number(form.amount), expense_date: form.expense_date });
      toast({ title: "Gasto registrado" });
      setShowModal(false);
      setForm({ category: "luz", description: "", amount: "", expense_date: format(new Date(), "yyyy-MM-dd") });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    await deleteExpense.mutateAsync(id);
    toast({ title: "Gasto eliminado" });
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Gastos</h1>
        <p className="text-sm text-muted-foreground">Registrá y controlá los egresos del predio</p>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          <button onClick={() => setViewMode("day")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", viewMode === "day" ? "bg-card shadow-sm" : "text-muted-foreground")}>Día</button>
          <button onClick={() => setViewMode("month")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", viewMode === "month" ? "bg-card shadow-sm" : "text-muted-foreground")}>Mes</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedDate(viewMode === "day" ? addDays(selectedDate, -1) : addMonths(selectedDate, -1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-bold capitalize min-w-[200px] text-center">
            {viewMode === "day" ? format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es }) : format(selectedDate, "MMMM yyyy", { locale: es })}
          </span>
          <button onClick={() => setSelectedDate(viewMode === "day" ? addDays(selectedDate, 1) : addMonths(selectedDate, 1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setSelectedDate(new Date())} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity">
          <Calendar className="w-3.5 h-3.5" /> Hoy
        </button>
        <button onClick={() => { setForm({ ...form, expense_date: dateStr }); setShowModal(true); }} className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity ml-auto">
          <Plus className="w-4 h-4" /> Nuevo gasto
        </button>
      </div>

      {/* Summary */}
      <div className="glass-card rounded-2xl p-5 mb-6 flex items-center gap-4">
        <Receipt className="w-6 h-6 text-destructive" />
        <div>
          <p className="text-xs text-muted-foreground">Total egresos {viewMode === "day" ? "del día" : "del mes"}</p>
          <p className="text-2xl font-extrabold text-destructive">${totalExpenses.toLocaleString()}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">Registros</p>
          <p className="text-xl font-extrabold">{filteredExpenses.length}</p>
        </div>
      </div>

      {/* List */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-10 bg-muted/50 rounded-2xl">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm font-semibold">No hay gastos registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExpenses.map((e) => {
            const cat = getCategoryInfo(e.category);
            return (
              <div key={e.id} className="glass-card rounded-xl p-4 flex items-center gap-3 text-sm">
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold">{cat.label}</p>
                  {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                  <p className="text-[10px] text-muted-foreground">{format(new Date(e.expense_date + "T12:00:00"), "d MMM yyyy", { locale: es })}</p>
                </div>
                <p className="font-extrabold text-destructive">${e.amount.toLocaleString()}</p>
                <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg">Nuevo gasto</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
                <select className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción (opcional)</label>
                <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalle del gasto" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto ($)</label>
                <input type="number" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha</label>
                <input type="date" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
              </div>
            </div>
            <button onClick={handleCreate} disabled={createExpense.isPending} className="w-full mt-5 bg-destructive text-destructive-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {createExpense.isPending ? "Guardando..." : "Registrar gasto"}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminExpenses;
