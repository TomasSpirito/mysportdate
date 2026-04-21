import { useState, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  useFacility, useCourts, useSports, useAddons,
  useCreateCourt, useUpdateCourt, useDeleteCourt,
  useCreateSport, useUpdateSport, useDeleteSport,
  useCreateAddon, useUpdateAddon, useDeleteAddon,
  useUploadCourtImage,
  type Court, type Sport, type Addon,
} from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { Plus, Edit2, Trash2, Trophy, Settings, X, Search, Check, Loader2, ImageIcon, PartyPopper } from "lucide-react"; 
import { toast } from "@/hooks/use-toast";

// Agregamos "event" a los tipos de modales
type ModalType = "court" | "event" | "sport" | "addon" | null;

const PREDEFINED_SPORTS = [
  { name: "Fútbol 5", icon: "⚽" }, { name: "Fútbol 7", icon: "⚽" }, { name: "Fútbol 8", icon: "⚽" },
  { name: "Fútbol 11", icon: "⚽" }, { name: "Futsal", icon: "⚽" }, { name: "Pádel", icon: "🎾" },
  { name: "Tenis", icon: "🎾" }, { name: "Básquet", icon: "🏀" }, { name: "Vóley", icon: "🏐" },
  { name: "Beach Vóley", icon: "🏐" }, { name: "Hockey", icon: "🏑" }, { name: "Handball", icon: "🤾" },
  { name: "Rugby", icon: "🏉" }, { name: "Softball", icon: "🥎" }
];

const PREDEFINED_ADDONS = [
  { name: "Pelotas", icon: "⚽", price: 500 }, { name: "Pecheras", icon: "🦺", price: 300 },
  { name: "Agua mineral", icon: "💧", price: 200 }, { name: "Bebida isotónica", icon: "🥤", price: 400 },
  { name: "Iluminación extra", icon: "💡", price: 600 }, { name: "Vestuario", icon: "🚿", price: 500 },
  { name: "Estacionamiento", icon: "🅿️", price: 0 }, { name: "Parrilla", icon: "🔥", price: 1500 },
];

const AdminCourts = () => {
  // Ahora tenemos 4 pestañas
  const [activeTab, setActiveTab] = useState<"courts" | "events" | "sports" | "addons">("courts");
  const { data: courts = [] } = useCourts();
  const { data: sports = [] } = useSports();
  const { data: addons = [] } = useAddons();
  const { data: facility } = useFacility();

  const createCourt = useCreateCourt(); const updateCourt = useUpdateCourt(); const deleteCourt = useDeleteCourt();
  const createSport = useCreateSport(); const updateSport = useUpdateSport(); const deleteSport = useDeleteSport();
  const createAddon = useCreateAddon(); const updateAddon = useUpdateAddon(); const deleteAddon = useDeleteAddon();
  
  const { uploadImage, uploadingImage } = useUploadCourtImage();

  const [modal, setModal] = useState<ModalType>(null);
  const [editing, setEditing] = useState<Court | Sport | Addon | null>(null);
  const [form, setForm] = useState<any>({});

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "court" | "event" | "sport" | "addon", id: string, name: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSportPicker, setShowSportPicker] = useState(false);
  const [showAddonPicker, setShowAddonPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const SURFACE_OPTIONS = ["Césped sintético", "Césped natural", "Cemento", "Parquet", "Madera", "Arena", "Caucho", "Baldosa", "Arcilla", "Tartán", "Otro"];

  // DIVIDIMOS LOS DATOS: Canchas físicas por un lado, Eventos por el otro
  const physicalCourtsList = courts.filter(c => !c.is_event);
  const eventPackagesList = courts.filter(c => c.is_event);

  const openCreate = (type: ModalType) => { 
      setEditing(null); 
      if (type === "court") {
          setForm({ name: "", surface: SURFACE_OPTIONS[0], features: "", image_url: "", sportsConfig: [{ sport_id: sports[0]?.id || "", price_per_hour: 0 }] });
      } else if (type === "event") {
          setForm({ name: "", image_url: "", event_price_per_hour: facility?.default_event_price || 0, event_duration_minutes: facility?.default_event_duration || 180, event_includes: facility?.default_event_includes || "", linked_court_ids: [] });
      } else if (type === "sport") {
          setForm({ name: "", icon: "⚽" });
      } else if (type === "addon") {
          setForm({ name: "", price: 0, icon: "📦" });
      }
      setModal(type); 
  };
  
  const openEdit = (type: ModalType, item: any) => { 
      setEditing(item); 
      if (type === "court") {
          setForm({ name: item.name, surface: item.surface || "", features: (item.features || []).join(", "), image_url: item.image_url || "", sportsConfig: [{ sport_id: item.sport_id || "", price_per_hour: item.price_per_hour || 0 }] });
      } else if (type === "event") {
          setForm({ name: item.name, image_url: item.image_url || "", event_price_per_hour: item.price_per_hour || 0, event_duration_minutes: item.duration_minutes || 180, event_includes: item.event_includes || "", linked_court_ids: item.linked_court_ids || [] });
      } else if (type === "sport") {
          setForm({ name: item.name, icon: item.icon });
      } else if (type === "addon") {
          setForm({ name: item.name, price: item.price, icon: item.icon });
      }
      setModal(type); 
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast({ title: "Error", description: "El archivo debe ser una imagen", variant: "destructive" });
    if (file.size > 2 * 1024 * 1024) return toast({ title: "Error", description: "La imagen es muy pesada (max 2MB)", variant: "destructive" });

    try {
        const publicUrl = await uploadImage(file);
        setForm((prev: any) => ({ ...prev, image_url: publicUrl }));
        toast({ title: "Foto subida ✅" });
    } catch {
        toast({ title: "Error", description: "No se pudo subir la foto", variant: "destructive" });
    } finally {
        event.target.value = '';
    }
  };

  const handleSave = async () => {
    try {
      if (modal === "court") {
          const sharedGroupId = editing ? (editing as Court).shared_group_id : crypto.randomUUID(); 
          const baseCourtData = {
              name: form.name, surface: form.surface, features: form.features ? form.features.split(",").map((f: string) => f.trim()).filter(Boolean) : [], image_url: form.image_url, shared_group_id: sharedGroupId
          };

          if (editing) {
              // 1. Actualiza la variante principal que abriste para editar
              await updateCourt.mutateAsync({ id: (editing as Court).id, ...baseCourtData, sport_id: form.sportsConfig[0].sport_id || null, price_per_hour: Number(form.sportsConfig[0].price_per_hour) } as any);
              
              // 2. Si agregaste variantes nuevas durante la edición, las crea vinculadas a la misma cancha física
              if (form.sportsConfig.length > 1) {
                  for (let i = 1; i < form.sportsConfig.length; i++) {
                      const config = form.sportsConfig[i];
                      await createCourt.mutateAsync({ ...baseCourtData, sport_id: config.sport_id || null, price_per_hour: Number(config.price_per_hour), is_event: false } as any);
                  }
              }
          } else {
              // 1. Creación de cancha nueva desde cero
              for (const config of form.sportsConfig) {
                  await createCourt.mutateAsync({ ...baseCourtData, sport_id: config.sport_id || null, price_per_hour: Number(config.price_per_hour), is_event: false } as any);
              }
          }
      } else if (modal === "event") {
          const sharedGroupId = editing ? (editing as Court).shared_group_id : crypto.randomUUID(); 
          const eventData = {
              name: form.name, surface: "Evento", features: [], image_url: form.image_url, shared_group_id: sharedGroupId, linked_court_ids: form.linked_court_ids || [],
              sport_id: null, is_event: true, price_per_hour: Number(form.event_price_per_hour), duration_minutes: Number(form.event_duration_minutes), event_includes: form.event_includes
          };

          if (editing) await updateCourt.mutateAsync({ id: (editing as Court).id, ...eventData } as any);
          else await createCourt.mutateAsync(eventData as any);
          
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

  const handleDeleteClick = (type: "court" | "event" | "sport" | "addon", id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === "court" || itemToDelete.type === "event") await deleteCourt.mutateAsync(itemToDelete.id);
      else if (itemToDelete.type === "sport") await deleteSport.mutateAsync(itemToDelete.id);
      else await deleteAddon.mutateAsync(itemToDelete.id);
      
      toast({ title: "Eliminado con éxito" });
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) { toast({ title: "Error al eliminar", description: err?.message, variant: "destructive" }); }
  };

  const handlePickSport = async (sport: { name: string; icon: string }) => {
    const existing = sports.find((s) => s.name.toLowerCase() === sport.name.toLowerCase());
    if (existing) { toast({ title: "Ya existe", description: `${sport.name} ya está agregado`, variant: "destructive" }); return; }
    try { await createSport.mutateAsync(sport); toast({ title: `${sport.icon} ${sport.name} agregado` }); } 
    catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  const handlePickAddon = async (addon: { name: string; icon: string; price: number }) => {
    const existing = addons.find((a) => a.name.toLowerCase() === addon.name.toLowerCase());
    if (existing) { toast({ title: "Ya existe", description: `${addon.name} ya está agregado`, variant: "destructive" }); return; }
    try { await createAddon.mutateAsync(addon); toast({ title: `${addon.icon} ${addon.name} agregado` }); } 
    catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  const existingSportNames = new Set(sports.map((s) => s.name.toLowerCase()));
  const existingAddonNames = new Set(addons.map((a) => a.name.toLowerCase()));
  const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const filteredPredefinedSports = PREDEFINED_SPORTS.filter((s) => normalize(s.name).includes(normalize(pickerSearch)));
  const filteredPredefinedAddons = PREDEFINED_ADDONS.filter((a) => normalize(a.name).includes(normalize(pickerSearch)));

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Infraestructura</h1>
        <p className="text-sm text-muted-foreground">Administrá canchas físicas, paquetes de eventos y extras</p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6 w-fit overflow-x-auto">
        {([{ key: "courts" as const, label: "Canchas Físicas", icon: Trophy }, { key: "events" as const, label: "Paquetes / Eventos", icon: PartyPopper }, { key: "sports" as const, label: "Deportes", icon: Settings }, { key: "addons" as const, label: "Extras", icon: Plus }]).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap", activeTab === tab.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* --- PESTAÑA CANCHAS FÍSICAS --- */}
      {activeTab === "courts" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">{physicalCourtsList.length} canchas</span>
            <button onClick={() => openCreate("court")} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Nueva cancha</button>
          </div>
          <div className="space-y-3">
            {physicalCourtsList.length === 0 && <p className="text-muted-foreground text-sm text-center py-10">No hay canchas físicas creadas.</p>}
            {physicalCourtsList.map((court) => {
              const sport = sports.find((s) => s.id === court.sport_id);
              return (
                <div key={court.id} className="glass-card rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-background flex items-center justify-center overflow-hidden shrink-0 border border-border shadow-sm">
                    {court.image_url ? <img src={court.image_url} alt={court.name} className="w-full h-full object-cover" loading="lazy" /> : <span className="text-3xl">{sport?.icon || <Trophy className="w-6 h-6 text-muted-foreground/40"/>}</span>}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{court.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{sport?.name} • {court.surface}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {court.features.map((f) => (<span key={f} className="px-2 py-0.5 rounded-full bg-background border border-border text-[10px] font-bold text-muted-foreground">{f}</span>))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-primary">${court.price_per_hour.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">/hora</p>
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => openEdit("court", court)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteClick("court", court.id, court.name)} className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- PESTAÑA EVENTOS / PAQUETES --- */}
      {activeTab === "events" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">{eventPackagesList.length} paquetes</span>
            <button onClick={() => openCreate("event")} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Nuevo paquete</button>
          </div>
          <div className="space-y-3">
            {eventPackagesList.length === 0 && <p className="text-muted-foreground text-sm text-center py-10">No hay paquetes de eventos creadados. ¡Armá tu primer combo!</p>}
            {eventPackagesList.map((eventPkg) => {
              return (
                <div key={eventPkg.id} className="glass-card rounded-2xl p-5 flex items-start gap-4 border-primary/30 bg-primary/5">
                  <div className="w-16 h-16 rounded-xl bg-background flex items-center justify-center overflow-hidden shrink-0 border border-border shadow-sm">
                    {eventPkg.image_url ? <img src={eventPkg.image_url} alt={eventPkg.name} className="w-full h-full object-cover" loading="lazy" /> : <span className="text-3xl">🎉</span>}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-primary">{eventPkg.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Paquete de Evento / Cumpleaños</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">Mínimo: {eventPkg.duration_minutes} min</span>
                        <span className="px-2 py-0.5 rounded-full bg-background border border-border text-[10px] font-bold text-muted-foreground">Bloquea {eventPkg.linked_court_ids?.length || 0} canchas</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-primary">${eventPkg.price_per_hour.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">/hora</p>
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => openEdit("event", eventPkg)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors bg-white"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteClick("event", eventPkg.id, eventPkg.name)} className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors bg-white"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- PESTAÑA DEPORTES --- */}
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
                  <button onClick={() => handleDeleteClick("sport", sport.id, sport.name)} className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PESTAÑA EXTRAS --- */}
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
                  <button onClick={() => handleDeleteClick("addon", addon.id, addon.name)} className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL UNIVERSAL: Cancha Física / Paquete Evento / Deporte / Extra */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg">{editing ? "Editar" : "Nuevo"} {modal === "court" ? "Espacio Físico" : modal === "event" ? "Paquete de Evento" : modal === "sport" ? "Deporte" : "Extra"}</h3>
              <button onClick={() => setModal(null)} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-4 px-1 pb-2">
              
              {/* === CAMPOS PARA CANCHA Y EVENTO (COMPARTEN FOTO Y NOMBRE) === */}
              {(modal === "court" || modal === "event") && (
                  <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground block">Foto de presentación</label>
                      <button 
                          onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}
                          className={cn("w-full h-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:border-primary transition-all overflow-hidden group", form.image_url && "border-solid border-primary p-0")}
                      >
                          {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : form.image_url ? <img src={form.image_url} alt="Cancha" className="w-full h-full object-cover" /> : <><ImageIcon className="w-6 h-6 mb-2 group-hover:text-primary transition-colors" /><span className="text-xs font-medium">Subir foto (Recomendado)</span></>}
                      </button>
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  </div>
              )}

              {(modal === "court" || modal === "event") && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre {modal === "event" ? "del Paquete" : "de la Cancha"}</label>
                    <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" placeholder={modal === "event" ? "Ej: Mega Evento VIP" : "Ej: Cancha 1"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
              )}
              
              {/* === CAMPOS EXCLUSIVOS: CANCHAS FÍSICAS === */}
              {modal === "court" && (
                <>
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Superficie</label>
                    <select className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.surface} onChange={(e) => setForm({ ...form, surface: e.target.value })}>
                      {SURFACE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Características (separadas por coma)</label>
                    <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" placeholder="Techada, Iluminación LED" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
                  </div>
                  <div className="pt-2 border-t border-border/50">
                      <label className="text-xs font-bold text-foreground mb-3 block">Deportes que se juegan aquí</label>
                      <div className="space-y-3">
                          {form.sportsConfig?.map((config: any, index: number) => (
                              <div key={index} className="flex gap-2 items-end bg-muted/10 p-3 rounded-xl border border-border/50">
                                  <div className="flex-1">
                                      <label className="text-[10px] font-medium text-muted-foreground block mb-1">Deporte</label>
                                      <select className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background outline-none focus:border-primary" value={config.sport_id} onChange={(e) => { const newConfig = [...form.sportsConfig]; newConfig[index].sport_id = e.target.value; setForm({ ...form, sportsConfig: newConfig }); }}>
                                          <option value="">Seleccionar...</option>
                                          {sports.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                                      </select>
                                  </div>
                                  <div className="w-1/3">
                                      <label className="text-[10px] font-medium text-muted-foreground block mb-1">Precio x hora ($)</label>
                                      <input type="number" className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background outline-none focus:border-primary" value={config.price_per_hour} onChange={(e) => { const newConfig = [...form.sportsConfig]; newConfig[index].price_per_hour = e.target.value; setForm({ ...form, sportsConfig: newConfig }); }} />
                                  </div>
                                  {/* Mostrar el botón de eliminar si hay más de 1 opción. Si estamos editando, protegemos la opción base (index 0) */}
                                  {form.sportsConfig.length > 1 && (!editing || index > 0) && (
                                      <button onClick={() => { const newConfig = form.sportsConfig.filter((_:any, i:number) => i !== index); setForm({ ...form, sportsConfig: newConfig }); }} className="mb-0.5 p-2 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                  )}
                              </div>
                          ))}
                      </div>
                      <button onClick={() => setForm({ ...form, sportsConfig: [...form.sportsConfig, { sport_id: "", price_per_hour: 0 }] })} className="mt-3 text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                          <Plus className="w-3 h-3" /> Agregar variante de deporte
                      </button>
                  </div>
                </>
              )}

              {/* === CAMPOS EXCLUSIVOS: PAQUETES DE EVENTO === */}
              {modal === "event" && (
                <>
                  <div className="grid grid-cols-2 gap-3 bg-primary/5 p-4 rounded-xl border border-primary/20">
                      <div>
                          <label className="text-[10px] font-bold text-primary block mb-1">Precio x hora (Evento) $</label>
                          <input type="number" className="w-full border-2 border-primary/20 rounded-xl px-3 py-2 text-sm bg-background outline-none focus:border-primary font-semibold" value={form.event_price_per_hour} onChange={(e) => setForm({ ...form, event_price_per_hour: e.target.value })} />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-primary block mb-1">Duración mínima (min)</label>
                          <input type="number" className="w-full border-2 border-primary/20 rounded-xl px-3 py-2 text-sm bg-background outline-none focus:border-primary font-semibold" value={form.event_duration_minutes} onChange={(e) => setForm({ ...form, event_duration_minutes: e.target.value })} />
                      </div>
                      <div className="col-span-2">
                          <label className="text-[10px] font-bold text-primary block mb-1">¿Qué incluye este paquete?</label>
                          <input type="text" placeholder="Ej: Animador, 2 panchos por chico, bebidas" className="w-full border-2 border-primary/20 rounded-xl px-3 py-2 text-sm bg-background outline-none focus:border-primary font-semibold" value={form.event_includes} onChange={(e) => setForm({ ...form, event_includes: e.target.value })} />
                      </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-border/50">
                      <label className="text-xs font-bold text-muted-foreground block mb-2">Canchas a bloquear al reservar</label>
                      <p className="text-[10px] text-muted-foreground mb-3">Las canchas que marques acá se mostrarán ocupadas en el calendario cuando alguien compre este evento.</p>
                      
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto bg-muted/10 rounded-xl border border-border/50 p-3 custom-scrollbar">
                          {physicalCourtsList.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">No tenés canchas físicas creadas todavía.</p>
                          ) : (
                              physicalCourtsList
                              // Filtramos para que si una cancha física tiene variantes de deporte, aparezca 1 sola vez en la lista
                              .filter((c, i, self) => c.shared_group_id && self.findIndex(x => x.shared_group_id === c.shared_group_id) === i)
                              .map((c) => (
                                  <label key={c.shared_group_id} className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50">
                                      <input 
                                          type="checkbox" 
                                          className="w-4 h-4 rounded border-primary/30 text-primary focus:ring-primary cursor-pointer"
                                          checked={form.linked_court_ids?.includes(c.shared_group_id)}
                                          onChange={(e) => {
                                              const current = form.linked_court_ids || [];
                                              if (e.target.checked) setForm({ ...form, linked_court_ids: [...current, c.shared_group_id] });
                                              else setForm({ ...form, linked_court_ids: current.filter((id: string) => id !== c.shared_group_id) });
                                          }}
                                      />
                                      Bloquear: {c.name}
                                  </label>
                              ))
                          )}
                      </div>
                  </div>
                </>
              )}

              {/* === CAMPOS EXCLUSIVOS: DEPORTES === */}
              {modal === "sport" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Ícono (emoji)</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:border-primary" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                </div>
              )}

              {/* === CAMPOS EXCLUSIVOS: EXTRAS === */}
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
                    {alreadyAdded && <Check className="w-4 h-4 text-primary" />}
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

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-border/50">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-xl mb-2">¿Eliminar {itemToDelete.type === "court" ? "cancha" : itemToDelete.type === "event" ? "paquete" : itemToDelete.type === "sport" ? "deporte" : "extra"}?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Estás a punto de eliminar <strong>"{itemToDelete.name}"</strong>. Esta acción no se puede deshacer.
            </p>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => { setDeleteModalOpen(false); setItemToDelete(null); }} 
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                disabled={deleteCourt.isPending || deleteSport.isPending || deleteAddon.isPending}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-destructive text-white hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCourts;