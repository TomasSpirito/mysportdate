import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  useCourts, useSports, useAddons,
  useCreateCourt, useUpdateCourt, useDeleteCourt,
  useCreateSport, useUpdateSport, useDeleteSport,
  useCreateAddon, useUpdateAddon, useDeleteAddon,
  type Court, type Sport, type Addon,
} from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { Plus, Edit2, Trash2, Trophy, Settings, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ModalType = "court" | "sport" | "addon" | null;

const AdminCourts = () => {
  const [activeTab, setActiveTab] = useState<"courts" | "sports" | "addons">("courts");
  const { data: courts = [] } = useCourts();
  const { data: sports = [] } = useSports();
  const { data: addons = [] } = useAddons();

  const createCourt = useCreateCourt(); const updateCourt = useUpdateCourt(); const deleteCourt = useDeleteCourt();
  const createSport = useCreateSport(); const updateSport = useUpdateSport(); const deleteSport = useDeleteSport();
  const createAddon = useCreateAddon(); const updateAddon = useUpdateAddon(); const deleteAddon = useDeleteAddon();

  const [modal, setModal] = useState<ModalType>(null);
  const [editing, setEditing] = useState<Court | Sport | Addon | null>(null);
  const [form, setForm] = useState<any>({});

  const openCreate = (type: ModalType) => { setEditing(null); setForm(type === "court" ? { name: "", sport_id: sports[0]?.id || "", surface: "Sintético", price_per_hour: 0, features: "" } : type === "sport" ? { name: "", icon: "⚽" } : { name: "", price: 0, icon: "📦" }); setModal(type); };
  const openEdit = (type: ModalType, item: any) => { setEditing(item); setForm(type === "court" ? { name: item.name, sport_id: item.sport_id, surface: item.surface || "", price_per_hour: item.price_per_hour, features: (item.features || []).join(", ") } : type === "sport" ? { name: item.name, icon: item.icon } : { name: item.name, price: item.price, icon: item.icon }); setModal(type); };

  const handleSave = async () => {
    try {
      if (modal === "court") {
        const courtData = { name: form.name, sport_id: form.sport_id, surface: form.surface, price_per_hour: Number(form.price_per_hour), features: form.features ? form.features.split(",").map((f: string) => f.trim()).filter(Boolean) : [] };
        if (editing) await updateCourt.mutateAsync({ id: (editing as Court).id, ...courtData });
        else await createCourt.mutateAsync(courtData);
      } else if (modal === "sport") {
        if (editing) await updateSport.mutateAsync({ id: (editing as Sport).id, name: form.name, icon: form.icon });
        else await createSport.mutateAsync({ name: form.name, icon: form.icon });
      } else if (modal === "addon") {
        if (editing) await updateAddon.mutateAsync({ id: (editing as Addon).id, name: form.name, price: Number(form.price), icon: form.icon });
        else await createAddon.mutateAsync({ name: form.name, price: Number(form.price), icon: form.icon });
      }
      toast({ title: editing ? "Actualizado" : "Creado" });
      setModal(null);
    } catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  const handleDelete = async (type: "court" | "sport" | "addon", id: string) => {
    if (!confirm("¿Estás seguro?")) return;
    try {
      if (type === "court") await deleteCourt.mutateAsync(id);
      else if (type === "sport") await deleteSport.mutateAsync(id);
      else await deleteAddon.mutateAsync(id);
      toast({ title: "Eliminado" });
    } catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Gestión de Canchas</h1>
        <p className="text-sm text-muted-foreground">Administrá canchas, deportes y extras</p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6 w-fit">
        {([{ key: "courts" as const, label: "Canchas", icon: Trophy }, { key: "sports" as const, label: "Deportes", icon: Settings }, { key: "addons" as const, label: "Extras", icon: Plus }]).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === tab.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "courts" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">{courts.length} canchas</span>
            <button onClick={() => openCreate("court")} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Nueva cancha</button>
          </div>
          <div className="space-y-3">
            {courts.map((court) => {
              const sport = sports.find((s) => s.id === court.sport_id);
              return (
                <div key={court.id} className="glass-card rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl">{sport?.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold">{court.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{sport?.name} • {court.surface}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">{court.features.map((f) => (<span key={f} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">{f}</span>))}</div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-primary">${court.price_per_hour.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">/hora</p>
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => openEdit("court", court)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete("court", court.id)} className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "sports" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">{sports.length} deportes</span>
            <button onClick={() => openCreate("sport")} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Nuevo deporte</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sports.map((sport) => (
              <div key={sport.id} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                <span className="text-4xl">{sport.icon}</span>
                <div className="flex-1"><h3 className="font-bold">{sport.name}</h3><p className="text-xs text-muted-foreground">{courts.filter((c) => c.sport_id === sport.id).length} canchas</p></div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit("sport", sport)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete("sport", sport.id)} className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "addons" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">{addons.length} extras</span>
            <button onClick={() => openCreate("addon")} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Nuevo extra</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addons.map((addon) => (
              <div key={addon.id} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                <span className="text-3xl">{addon.icon}</span>
                <div className="flex-1"><h3 className="font-bold text-sm">{addon.name}</h3><p className="text-xs text-primary font-semibold">${addon.price.toLocaleString()}</p></div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit("addon", addon)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete("addon", addon.id)} className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg">{editing ? "Editar" : "Nueva"} {modal === "court" ? "cancha" : modal === "sport" ? "deporte" : "extra"}</h3>
              <button onClick={() => setModal(null)} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre</label>
                <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              {modal === "court" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Deporte</label>
                    <select className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.sport_id} onChange={(e) => setForm({ ...form, sport_id: e.target.value })}>
                      {sports.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Superficie</label>
                    <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.surface} onChange={(e) => setForm({ ...form, surface: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Precio por hora ($)</label>
                    <input type="number" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.price_per_hour} onChange={(e) => setForm({ ...form, price_per_hour: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Features (separadas por coma)</label>
                    <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" placeholder="Techada, Iluminación LED" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
                  </div>
                </>
              )}
              {modal === "sport" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Ícono (emoji)</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                </div>
              )}
              {modal === "addon" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Precio ($)</label>
                    <input type="number" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Ícono (emoji)</label>
                    <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                  </div>
                </>
              )}
            </div>
            <button onClick={handleSave} className="w-full mt-5 bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
              {editing ? "Guardar cambios" : "Crear"}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCourts;
