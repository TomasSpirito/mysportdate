import { useState, useRef } from "react"; // <--- Agregamos useRef
import AdminLayout from "@/components/layout/AdminLayout";
import {
  useCourts, useSports, useAddons,
  useCreateCourt, useUpdateCourt, useDeleteCourt,
  useCreateSport, useUpdateSport, useDeleteSport,
  useCreateAddon, useUpdateAddon, useDeleteAddon,
  useUploadCourtImage, // <--- Importamos el hook
  type Court, type Sport, type Addon,
} from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
// <--- Agregamos Upload, Loader2, ImageIcon
import { Plus, Edit2, Trash2, Trophy, Settings, X, Search, Check, Upload, Loader2, ImageIcon } from "lucide-react"; 
import { toast } from "@/hooks/use-toast";

type ModalType = "court" | "sport" | "addon" | null;

const PREDEFINED_SPORTS = [
  { name: "Fútbol 5", icon: "⚽" }, { name: "Fútbol 7", icon: "⚽" }, { name: "Fútbol 8", icon: "⚽" },
  { name: "Fútbol 11", icon: "⚽" }, { name: "Futsal", icon: "⚽" }, { name: "Pádel", icon: "🎾" },
  { name: "Tenis", icon: "🎾" }, { name: "Básquet", icon: "🏀" }, { name: "Vóley", icon: "🏐" },
  { name: "Beach Vóley", icon: "🏐" }, { name: "Hockey", icon: "🏑" }, { name: "Handball", icon: "🤾" },
  { name: "Rugby", icon: "🏉" }, { name: "Softball", icon: "🥎" }, { name: "Béisbol", icon: "⚾" },
  { name: "Cricket", icon: "🏏" }, { name: "Squash", icon: "🏸" }, { name: "Badminton", icon: "🏸" },
  { name: "Ping Pong", icon: "🏓" }, { name: "Boxeo", icon: "🥊" }, { name: "Artes Marciales", icon: "🥋" },
  { name: "Gimnasia", icon: "🤸" }, { name: "Natación", icon: "🏊" }, { name: "Atletismo", icon: "🏃" },
  { name: "Ciclismo", icon: "🚴" }, { name: "Patinaje", icon: "⛸️" }, { name: "Escalada", icon: "🧗" },
  { name: "Fútbol Americano", icon: "🏈" }, { name: "Lacrosse", icon: "🥍" }, { name: "Golf", icon: "⛳" },
  { name: "Polo", icon: "🐴" }, { name: "Esgrima", icon: "🤺" }, { name: "Crossfit", icon: "🏋️" },
  { name: "Yoga", icon: "🧘" }, { name: "Pilates", icon: "🤸" }, { name: "Funcional", icon: "💪" },
  { name: "Spinning", icon: "🚲" }, { name: "Pickleball", icon: "🏓" },
];

const PREDEFINED_ADDONS = [
  { name: "Pelotas", icon: "⚽", price: 500 }, { name: "Pecheras", icon: "🦺", price: 300 },
  { name: "Agua mineral", icon: "💧", price: 200 }, { name: "Bebida isotónica", icon: "🥤", price: 400 },
  { name: "Paletas de pádel", icon: "🏓", price: 800 }, { name: "Raquetas", icon: "🎾", price: 1000 },
  { name: "Iluminación extra", icon: "💡", price: 600 }, { name: "Vestuario", icon: "🚿", price: 500 },
  { name: "Estacionamiento", icon: "🅿️", price: 0 }, { name: "Parrilla", icon: "🔥", price: 1500 },
  { name: "Música / DJ", icon: "🎵", price: 2000 }, { name: "Botiquín", icon: "🩹", price: 0 },
  { name: "Toallas", icon: "🧴", price: 300 }, { name: "Alquiler de canilleras", icon: "🦵", price: 200 },
  { name: "Red de vóley", icon: "🏐", price: 400 }, { name: "Arcos portátiles", icon: "🥅", price: 600 },
];

const AdminCourts = () => {
  const [activeTab, setActiveTab] = useState<"courts" | "sports" | "addons">("courts");
  const { data: courts = [] } = useCourts();
  const { data: sports = [] } = useSports();
  const { data: addons = [] } = useAddons();

  const createCourt = useCreateCourt(); const updateCourt = useUpdateCourt(); const deleteCourt = useDeleteCourt();
  const createSport = useCreateSport(); const updateSport = useUpdateSport(); const deleteSport = useDeleteSport();
  const createAddon = useCreateAddon(); const updateAddon = useUpdateAddon(); const deleteAddon = useDeleteAddon();
  
  // Hook de subida de imagen de cancha
  const { uploadImage, uploadingImage } = useUploadCourtImage();

  const [modal, setModal] = useState<ModalType>(null);
  const [editing, setEditing] = useState<Court | Sport | Addon | null>(null);
  const [form, setForm] = useState<any>({});

  // Ref para el input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Predefined picker states
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [showAddonPicker, setShowAddonPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const SURFACE_OPTIONS = ["Césped sintético", "Césped natural", "Cemento", "Parquet", "Madera", "Arena", "Caucho", "Baldosa", "Arcilla", "Tartán", "Otro"];

  const openCreate = (type: ModalType) => { 
      setEditing(null); 
      setForm(type === "court" ? { name: "", sport_id: sports[0]?.id || "", surface: SURFACE_OPTIONS[0], price_per_hour: 0, features: "", image_url: "" } : type === "sport" ? { name: "", icon: "⚽" } : { name: "", price: 0, icon: "📦" }); 
      setModal(type); 
  };
  
  const openEdit = (type: ModalType, item: any) => { 
      setEditing(item); 
      setForm(type === "court" ? { name: item.name, sport_id: item.sport_id, surface: item.surface || "", price_per_hour: item.price_per_hour, features: (item.features || []).join(", "), image_url: item.image_url || "" } : type === "sport" ? { name: item.name, icon: item.icon } : { name: item.name, price: item.price, icon: item.icon }); 
      setModal(type); 
  };

  /* ── LÓGICA DE SUBIDA DE IMAGEN ── */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({ title: "Error", description: "El archivo debe ser una imagen", variant: "destructive" });
        return;
    }
    if (file.size > 2 * 1024 * 1024) { 
        toast({ title: "Error", description: "La imagen es muy pesada (max 2MB)", variant: "destructive" });
        return;
    }

    try {
        const publicUrl = await uploadImage(file);
        setForm((prev: any) => ({ ...prev, image_url: publicUrl }));
        toast({ title: "Foto de cancha subida ✅" });
    } catch {
        toast({ title: "Error", description: "No se pudo subir la foto", variant: "destructive" });
    } finally {
        event.target.value = '';
    }
  };


  const handleSave = async () => {
    try {
      if (modal === "court") {
        const courtData = { 
            name: form.name, 
            sport_id: form.sport_id, 
            surface: form.surface, 
            price_per_hour: Number(form.price_per_hour), 
            features: form.features ? form.features.split(",").map((f: string) => f.trim()).filter(Boolean) : [],
            image_url: form.image_url // Enviamos la URL de la imagen al hook
        };
        // Omitimos la validación estricta de TypeScript en la llamada al hook por si no actualizaste la interfaz aún
        if (editing) await updateCourt.mutateAsync({ id: (editing as Court).id, ...courtData } as any);
        else await createCourt.mutateAsync(courtData as any);
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

  const handlePickSport = async (sport: { name: string; icon: string }) => {
    const existing = sports.find((s) => s.name.toLowerCase() === sport.name.toLowerCase());
    if (existing) { toast({ title: "Ya existe", description: `${sport.name} ya está agregado`, variant: "destructive" }); return; }
    try {
      await createSport.mutateAsync(sport);
      toast({ title: `${sport.icon} ${sport.name} agregado` });
    } catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  const handlePickAddon = async (addon: { name: string; icon: string; price: number }) => {
    const existing = addons.find((a) => a.name.toLowerCase() === addon.name.toLowerCase());
    if (existing) { toast({ title: "Ya existe", description: `${addon.name} ya está agregado`, variant: "destructive" }); return; }
    try {
      await createAddon.mutateAsync(addon);
      toast({ title: `${addon.icon} ${addon.name} agregado` });
    } catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  const existingSportNames = new Set(sports.map((s) => s.name.toLowerCase()));
  const existingAddonNames = new Set(addons.map((a) => a.name.toLowerCase()));

  const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filteredPredefinedSports = PREDEFINED_SPORTS.filter((s) =>
    normalize(s.name).includes(normalize(pickerSearch))
  );
  const filteredPredefinedAddons = PREDEFINED_ADDONS.filter((a) =>
    normalize(a.name).includes(normalize(pickerSearch))
  );

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
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                    {court.image_url ? (
                        <img src={court.image_url} alt={court.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                        <span className="text-3xl">{sport?.icon || <Trophy className="w-6 h-6 text-muted-foreground/40"/>}</span>
                    )}
                  </div>
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
            <div className="flex gap-2">
              <button onClick={() => { setPickerSearch(""); setShowSportPicker(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Agregar deporte</button>
            </div>
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
            <button onClick={() => { setPickerSearch(""); setShowAddonPicker(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Agregar extra</button>
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

      {/* Edit modal (court/sport/addon) */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg">{editing ? "Editar" : "Nueva"} {modal === "court" ? "cancha" : modal === "sport" ? "deporte" : "extra"}</h3>
              <button onClick={() => setModal(null)} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-4 px-1 pb-2">
              {modal === "court" && (
                  <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground block">Foto de la cancha</label>
                      <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className={cn(
                              "w-full h-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:border-primary transition-all overflow-hidden group",
                              form.image_url && "border-solid border-primary p-0"
                          )}
                      >
                          {uploadingImage ? (
                              <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          ) : form.image_url ? (
                              <img src={form.image_url} alt="Cancha" className="w-full h-full object-cover" />
                          ) : (
                              <>
                                  <ImageIcon className="w-6 h-6 mb-2 group-hover:text-primary transition-colors" />
                                  <span className="text-xs font-medium">Subir foto (Recomendado)</span>
                              </>
                          )}
                      </button>
                      {/* Input oculto */}
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  </div>
              )}

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
                    <select className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.surface} onChange={(e) => setForm({ ...form, surface: e.target.value })}>
                      {SURFACE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
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
            <button onClick={handleSave} disabled={uploadingImage} className="w-full mt-5 bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {editing ? "Guardar cambios" : "Crear"}
            </button>
          </div>
        </div>
      )}

      {/* Sport picker modal */}
      {showSportPicker && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSportPicker(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg">Seleccionar deporte</h3>
              <button onClick={() => setShowSportPicker(false)} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input className="w-full border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" placeholder="Buscar deporte..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredPredefinedSports.map((sport) => {
                const alreadyAdded = existingSportNames.has(sport.name.toLowerCase());
                return (
                  <button key={sport.name} onClick={() => !alreadyAdded && handlePickSport(sport)} disabled={alreadyAdded}
                    className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors", alreadyAdded ? "opacity-50 cursor-not-allowed bg-muted/50" : "hover:bg-muted")}>
                    <span className="text-xl">{sport.icon}</span>
                    <span className="font-medium flex-1">{sport.name}</span>
                    {alreadyAdded && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
              {/* Custom option */}
              <button onClick={() => { setShowSportPicker(false); openCreate("sport"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-muted border-t border-border mt-2 pt-3">
                <span className="text-xl">✏️</span>
                <span className="font-medium">Otro (personalizado)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Addon picker modal */}
      {showAddonPicker && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddonPicker(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg">Seleccionar extra</h3>
              <button onClick={() => setShowAddonPicker(false)} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input className="w-full border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" placeholder="Buscar extra..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredPredefinedAddons.map((addon) => {
                const alreadyAdded = existingAddonNames.has(addon.name.toLowerCase());
                return (
                  <button key={addon.name} onClick={() => !alreadyAdded && handlePickAddon(addon)} disabled={alreadyAdded}
                    className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors", alreadyAdded ? "opacity-50 cursor-not-allowed bg-muted/50" : "hover:bg-muted")}>
                    <span className="text-xl">{addon.icon}</span>
                    <span className="font-medium flex-1">{addon.name}</span>
                    <span className="text-xs text-muted-foreground">${addon.price.toLocaleString()}</span>
                    {alreadyFormatted && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
              <button onClick={() => { setShowAddonPicker(false); openCreate("addon"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-muted border-t border-border mt-2 pt-3">
                <span className="text-xl">✏️</span>
                <span className="font-medium">Otro (personalizado)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCourts;