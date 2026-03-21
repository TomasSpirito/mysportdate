import { useState, useMemo } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useExpenses, useCreateExpense, useDeleteExpense, useUpdateExpense, useBuffetProducts, useCreateBuffetPurchase, useCreateBuffetProduct } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { format, addDays, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Trash2, ChevronLeft, ChevronRight, Calendar, X, Receipt, Download, ArrowLeft, Image as ImageIcon, Pencil, AlertTriangle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

const EXPENSE_CATEGORIES = [
  { value: "buffet_insumos", label: "Insumos de Buffet", icon: "🌭" },
  { value: "luz", label: "Luz / Electricidad", icon: "💡" },
  { value: "agua", label: "Agua", icon: "💧" },
  { value: "gas", label: "Gas", icon: "🔥" },
  { value: "internet", label: "Internet / Cable", icon: "📡" },
  { value: "alquiler", label: "Alquiler", icon: "🏠" },
  { value: "mantenimiento", label: "Mantenimiento", icon: "🔧" },
  { value: "limpieza", label: "Limpieza", icon: "🧹" },
  { value: "proveedores", label: "Proveedores Grales.", icon: "📦" },
  { value: "sueldos", label: "Sueldos / Personal", icon: "👷" },
  { value: "impuestos", label: "Impuestos", icon: "📋" },
  { value: "seguros", label: "Seguros", icon: "🛡️" },
  { value: "marketing", label: "Publicidad", icon: "📣" },
  { value: "equipamiento", label: "Equipamiento", icon: "🏐" },
  { value: "otro", label: "Otro", icon: "📝" },
];

const AdminExpenses = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<"category" | "product" | "details">("category");
  const [selectedProduct, setSelectedProduct] = useState<any | "new">(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // NUEVO: Estado para el Popup de Eliminación Custom
  const [deletePrompt, setDeletePrompt] = useState<{id: string, isBuffet: boolean} | null>(null);
  
  const [form, setForm] = useState({ 
      category: "", description: "", amount: "", expense_date: format(new Date(), "yyyy-MM-dd"), 
      quantity: "1", newProductName: "", newProductPrice: "", newProductCategory: "Bebidas" 
  });

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: expenses = [] } = useExpenses(viewMode === "day" ? dateStr : undefined);
  const { data: buffetProducts = [] } = useBuffetProducts();
  
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const createBuffetPurchase = useCreateBuffetPurchase();
  const createBuffetProduct = useCreateBuffetProduct();

  const filteredExpenses = useMemo(() => {
    if (viewMode === "day") return expenses;
    const monthStr = format(selectedDate, "yyyy-MM");
    return expenses.filter((e) => e.expense_date.startsWith(monthStr));
  }, [expenses, selectedDate, viewMode]);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const getCategoryInfo = (cat: string) => EXPENSE_CATEGORIES.find((c) => c.value === cat) || { label: cat, icon: "📝" };

  const handleOpenModal = () => {
      setEditingId(null);
      setStep("category");
      setSelectedProduct(null);
      setForm({ category: "", description: "", amount: "", expense_date: dateStr, quantity: "1", newProductName: "", newProductPrice: "", newProductCategory: "Bebidas" });
      setShowModal(true);
  };

  const handleEditClick = (expense: any) => {
      setEditingId(expense.id);
      setForm({
          ...form,
          category: expense.category,
          description: expense.description || "",
          amount: expense.amount.toString(),
          expense_date: expense.expense_date
      });
      setStep("details");
      setShowModal(true);
  };

  const selectCategory = (catValue: string) => {
      setForm(prev => ({ ...prev, category: catValue }));
      if (catValue === "buffet_insumos") {
          setStep("product");
      } else {
          setStep("details");
      }
  };

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: "Ingresá un monto válido", variant: "destructive" });
      return;
    }

    try {
      if (editingId) {
          await updateExpense.mutateAsync({
              id: editingId, category: form.category, description: form.description || undefined,
              amount: Number(form.amount), expense_date: form.expense_date
          });
          toast({ title: "Gasto actualizado ✅" });
      } else {
          if (form.category === "buffet_insumos") {
            const totalAmount = Number(form.amount);
            const qty = Number(form.quantity);
            const unitPrice = totalAmount / qty;

            if (selectedProduct === "new") {
                if (!form.newProductName || !form.newProductPrice) return toast({ title: "Completá los datos del nuevo producto", variant: "destructive" });
                const newProd = await createBuffetProduct.mutateAsync({ name: form.newProductName, category: form.newProductCategory, price: Number(form.newProductPrice), stock: 0 });
                await createBuffetPurchase.mutateAsync({ product_id: newProd.id, quantity: qty, unit_price: unitPrice, total_price: totalAmount });
                toast({ title: "Producto creado y compra registrada ✅" });
            } else {
                await createBuffetPurchase.mutateAsync({ product_id: selectedProduct.id, quantity: qty, unit_price: unitPrice, total_price: totalAmount });
                toast({ title: "Compra registrada y stock actualizado ✅" });
            }
          } else {
            await createExpense.mutateAsync({ category: form.category, description: form.description || undefined, amount: Number(form.amount), expense_date: form.expense_date });
            toast({ title: "Gasto registrado ✅" });
          }
      }
      setShowModal(false);
    } catch (err: any) {
      toast({ title: "Error al guardar", description: err?.message, variant: "destructive" });
    }
  };

  // NUEVO: Abre el modal de advertencia en lugar del window.confirm
  const handleDeleteClick = (id: string, isBuffet: boolean) => {
      setDeletePrompt({ id, isBuffet });
  };

  // NUEVO: Ejecuta la eliminación real
  const confirmDelete = async () => {
      if (!deletePrompt) return;
      try {
          await deleteExpense.mutateAsync(deletePrompt.id);
          toast({ title: deletePrompt.isBuffet ? "Compra eliminada y stock revertido" : "Gasto eliminado" });
      } catch (err) {
          toast({ title: "Error al eliminar", variant: "destructive" });
      } finally {
          setDeletePrompt(null);
      }
  };

  const handleExportExcel = () => {
      if (filteredExpenses.length === 0) return toast({ title: "No hay datos", variant: "destructive" });
      const dataToExport = filteredExpenses.map(e => ({
          Fecha: format(new Date(e.expense_date + "T12:00:00"), "dd/MM/yyyy"),
          Categoría: getCategoryInfo(e.category).label,
          Descripción: e.description || "-", Monto: e.amount
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Gastos");
      XLSX.writeFile(workbook, `Reporte_Gastos_${viewMode === 'day' ? dateStr : format(selectedDate, 'yyyy-MM')}.xlsx`);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-extrabold">Control de Gastos</h1>
            <p className="text-sm text-muted-foreground">Registrá egresos, compras de mercadería y descargá reportes</p>
        </div>
        <button onClick={handleExportExcel} className="flex items-center justify-center gap-2 bg-[#107c41] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0e6e39] transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Exportar a Excel
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          <button onClick={() => setViewMode("day")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", viewMode === "day" ? "bg-card shadow-sm" : "text-muted-foreground")}>Día</button>
          <button onClick={() => setViewMode("month")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", viewMode === "month" ? "bg-card shadow-sm" : "text-muted-foreground")}>Mes</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedDate(viewMode === "day" ? addDays(selectedDate, -1) : addMonths(selectedDate, -1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-bold capitalize min-w-[200px] text-center">{viewMode === "day" ? format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es }) : format(selectedDate, "MMMM yyyy", { locale: es })}</span>
          <button onClick={() => setSelectedDate(viewMode === "day" ? addDays(selectedDate, 1) : addMonths(selectedDate, 1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setSelectedDate(new Date())} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity">
          <Calendar className="w-3.5 h-3.5" /> Hoy
        </button>
        <button onClick={handleOpenModal} className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity ml-auto shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo gasto
        </button>
      </div>

      <div className="glass-card rounded-2xl p-5 mb-6 flex items-center gap-4 border-l-4 border-destructive">
        <Receipt className="w-6 h-6 text-destructive" />
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Total egresos {viewMode === "day" ? "del día" : "del mes"}</p>
          <p className="text-2xl font-black text-destructive">${totalExpenses.toLocaleString()}</p>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-10 bg-muted/30 rounded-2xl border border-dashed border-border/50">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm font-semibold text-muted-foreground">No hay gastos en este periodo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExpenses.map((e) => {
            const cat = getCategoryInfo(e.category);
            const isBuffet = e.category === "buffet_insumos";
            return (
              <div key={e.id} className="glass-card rounded-xl p-4 flex items-center gap-3 sm:gap-4 text-sm hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl shrink-0">{cat.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{cat.label}</p>
                  {e.description && <p className="text-xs text-muted-foreground truncate">{e.description}</p>}
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 uppercase tracking-wider">{format(new Date(e.expense_date + "T12:00:00"), "d MMM yyyy", { locale: es })}</p>
                </div>
                <p className="font-black text-destructive text-base sm:text-lg shrink-0">${e.amount.toLocaleString()}</p>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={() => handleEditClick(e)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="w-4 h-4" /></button>
                    {/* Llamamos al nuevo popup en vez de al confirm nativo */}
                    <button onClick={() => handleDeleteClick(e.id, isBuffet)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP PERSONALIZADO DE ELIMINACIÓN */}
      {deletePrompt && (
        <div className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeletePrompt(null)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="font-black text-xl mb-2">
                    {deletePrompt.isBuffet ? "¿Anular compra?" : "¿Eliminar gasto?"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                    {deletePrompt.isBuffet 
                        ? "El sistema RESTARÁ automáticamente del inventario el stock que había sumado en esta compra. Esta acción no se puede deshacer." 
                        : "Vas a eliminar este registro de tus egresos. Esta acción no se puede deshacer."}
                </p>
                <div className="flex gap-3 w-full">
                    <button onClick={() => setDeletePrompt(null)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-muted hover:bg-muted/80 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={confirmDelete} disabled={deleteExpense.isPending} className="flex-1 py-3 rounded-xl font-bold text-sm bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                        {deleteExpense.isPending ? "Eliminando..." : "Sí, eliminar"}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* SÚPER MODAL MULTI-PASO DE GASTOS */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className={cn("bg-card rounded-3xl p-6 w-full shadow-2xl flex flex-col transition-all duration-300 max-h-[90vh]", step === "details" ? "max-w-md" : "max-w-3xl")}>
            
            <div className="flex items-center justify-between mb-6 shrink-0 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                  {step !== "category" && !editingId && (
                      <button onClick={() => setStep(step === "details" && form.category === "buffet_insumos" ? "product" : "category")} className="p-1.5 rounded-lg bg-muted hover:bg-secondary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                  )}
                  <div>
                      <h3 className="font-extrabold text-xl">
                          {editingId ? "Editar registro" : step === "category" ? "¿Qué tipo de gasto es?" : step === "product" ? "Seleccioná el producto" : "Detalles"}
                      </h3>
                      {!editingId && <p className="text-xs text-muted-foreground mt-0.5">Paso {step === "category" ? "1" : step === "product" ? "2" : step === "details" && form.category === "buffet_insumos" ? "3" : "2"} de {form.category === "buffet_insumos" ? "3" : "2"}</p>}
                  </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar pr-2 pb-2">
                
                {step === "category" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                        {EXPENSE_CATEGORIES.map((c) => (
                            <button key={c.value} onClick={() => selectCategory(c.value)}
                                className={cn("flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-2xl border-2 transition-all hover:-translate-y-1 hover:shadow-md", 
                                    c.value === "buffet_insumos" ? "border-primary/30 bg-primary/5 hover:border-primary" : "border-border/50 bg-muted/20 hover:border-primary/50 hover:bg-muted/50"
                                )}>
                                <span className="text-4xl drop-shadow-sm">{c.icon}</span>
                                <span className="font-bold text-xs sm:text-sm text-center leading-tight">{c.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {step === "product" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        <button onClick={() => { setSelectedProduct("new"); setStep("details"); }}
                            className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all group min-h-[140px]">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus className="w-6 h-6 text-primary" /></div>
                            <span className="font-bold text-sm text-primary text-center">Nuevo<br/>Producto</span>
                        </button>
                        {buffetProducts.map((p) => (
                            <button key={p.id} onClick={() => { setSelectedProduct(p); setStep("details"); }}
                                className="flex flex-col text-left rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-md hover:border-primary/50 transition-all group">
                                <div className="w-full h-24 bg-muted relative flex items-center justify-center overflow-hidden">
                                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <ImageIcon className="w-8 h-8 text-muted-foreground/30" />}
                                    <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">Stock: {p.stock}</div>
                                </div>
                                <div className="p-3"><span className="font-bold text-sm truncate w-full block">{p.name}</span></div>
                            </button>
                        ))}
                    </div>
                )}

                {step === "details" && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                            <span className="text-2xl">{form.category === "buffet_insumos" ? "🌭" : getCategoryInfo(form.category).icon}</span>
                            <div>
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Categoría</p>
                                <p className="font-bold text-sm">
                                    {form.category === "buffet_insumos" && !editingId
                                        ? `Compra: ${selectedProduct === "new" ? "Nuevo Producto" : selectedProduct?.name}`
                                        : getCategoryInfo(form.category).label}
                                </p>
                            </div>
                        </div>

                        {/* EXPLICACIÓN ERP SI INTENTA EDITAR UNA COMPRA */}
                        {editingId && form.category === "buffet_insumos" && (
                            <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl flex gap-3">
                                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-orange-800">
                                    <p className="font-bold mb-1 text-sm">Protocolo de Inventario (ERP)</p>
                                    <p className="mb-2">Un comprobante ya emitido no modifica el producto maestro ni sus cantidades, para mantener la auditoría contable.</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li>Para cambiar el nombre o precio de venta, andá a la pestaña <b>Buffet</b>.</li>
                                        <li>Si te equivocaste en la compra, <b>eliminá este gasto</b> y cargalo de nuevo.</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {!editingId && form.category === "buffet_insumos" && selectedProduct === "new" && (
                            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                <h4 className="font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-primary"/> Nuevo producto en inventario</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Nombre del producto</label>
                                        <input type="text" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:border-primary" 
                                            value={form.newProductName} onChange={(e) => setForm({ ...form, newProductName: e.target.value })} placeholder="Ej: Coca Cola 500ml" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Precio de Venta ($)</label>
                                            <input type="number" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:border-primary" 
                                                value={form.newProductPrice} onChange={(e) => setForm({ ...form, newProductPrice: e.target.value })} placeholder="Ej: 1500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Tipo</label>
                                            <select className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:border-primary" 
                                                value={form.newProductCategory} onChange={(e) => setForm({ ...form, newProductCategory: e.target.value })}>
                                                <option value="Bebidas">Bebidas</option>
                                                <option value="Comidas">Comidas</option>
                                                <option value="Snacks">Snacks</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {!editingId && form.category === "buffet_insumos" ? (
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Cantidad que ingresa</label>
                                    <input type="number" min="1" className="w-full border border-border rounded-xl px-4 py-3 text-base bg-background outline-none focus:border-primary font-bold" 
                                        value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                                </div>
                            ) : (
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Descripción (opcional)</label>
                                    <input className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background outline-none focus:border-primary transition-colors" 
                                        value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalle del gasto" />
                                </div>
                            )}

                            <div className={cn((editingId || form.category !== "buffet_insumos") && "sm:col-span-2")}>
                                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Costo TOTAL ($)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-destructive font-black">$</span>
                                    <input type="number" 
                                        disabled={editingId !== null && form.category === "buffet_insumos"} 
                                        className={cn("w-full border-2 border-destructive/50 rounded-xl pl-8 pr-4 py-3 text-lg font-black text-destructive transition-colors outline-none", 
                                            editingId && form.category === "buffet_insumos" ? "bg-muted cursor-not-allowed opacity-70" : "bg-background focus:border-destructive")} 
                                        value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Fecha de la transacción</label>
                            <input type="date" className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background outline-none focus:border-primary transition-colors font-medium cursor-pointer" 
                                value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                        </div>
                        
                        <button onClick={handleSave} disabled={createExpense.isPending || updateExpense.isPending || (createBuffetPurchase as any)?.isPending} 
                            className="w-full mt-2 bg-destructive text-destructive-foreground py-4 rounded-xl font-black text-base hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md">
                            {editingId ? "Guardar Cambios" : createExpense.isPending ? "Procesando..." : (form.category === "buffet_insumos" ? "Ingresar Mercadería y Pagar" : "Confirmar Egreso")}
                        </button>
                    </div>
                )}

            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminExpenses;