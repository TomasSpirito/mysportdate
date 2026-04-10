import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useFacility, useUpdateFacility, useFacilitySchedules, useUpsertFacilitySchedule, useUploadFacilityImage, useHolidays, useCreateHoliday, useDeleteHoliday, type Facility } from "@/hooks/use-supabase-data";
import { Clock, MapPin, Phone, Save, Mail, MessageCircle, Link2, Copy, Check, Image as ImageIcon, Instagram, Map, Info, Star, Upload, Plus, Percent, ShieldCheck, Banknote, Timer, PartyPopper, CalendarCheck, X, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
// ASUMIMOS QUE TU CLIENTE DE SUPABASE ESTÁ ACÁ (ajustá la ruta si es distinta en tu proyecto)
import { supabase } from "@/integrations/supabase/client";

// Extendemos el tipo Facility nativo para incluir las columnas nuevas sin usar 'any'
type ExtendedFacility = Facility & {
  requires_deposit?: boolean;
  deposit_percentage?: number;
  mp_connected?: boolean; // Bandera para saber si ya vinculó MP
  cancellation_window_hours?: number;
  // --- NUEVOS CAMPOS DE EVENTOS GLOBALES ---
  has_events?: boolean;
  default_event_duration?: number;
  default_event_includes?: string;
  default_event_price?: number;
  holiday_open_time?: string;
  holiday_close_time?: string;
  event_open_time?: string;
  event_close_time?: string;
};

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const PREDEFINED_AMENITIES = ["WiFi", "Estacionamiento", "Vestuarios", "Duchas", "Buffet / Bar", "Parrilla", "Salón de eventos", "Seguridad", "Iluminación LED"];

// Generamos opciones de horario de 1 en 1 hora (00:00, 01:00, etc.)
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return `${h}:00`;
});

const AdminSettings = () => {
  const { data: facilityBase } = useFacility();
  const facility = facilityBase as ExtendedFacility;
  
  const updateFacility = useUpdateFacility();
  const { data: schedules = [] } = useFacilitySchedules();
  const upsertSchedule = useUpsertFacilitySchedule();
  const { uploadImage, uploadingImage } = useUploadFacilityImage();
  
  const [copied, setCopied] = useState(false);
  const [isLinkingMP, setIsLinkingMP] = useState(false);

  const [facilityForm, setFacilityForm] = useState({ 
      name: "", location: "", phone: "", email: "", whatsapp: "",
      description: "", maps_url: "", instagram_url: "", logo_url: "", cover_url: "",
      amenities: [] as string[],
      requires_deposit: false,
      deposit_percentage: 50,
      mp_connected: false,
      cancellation_window_hours: 12,
      has_events: false,
      default_event_duration: 180,
      default_event_includes: "",
      default_event_price: 0,
      holiday_open_time: "12:00",
      holiday_close_time: "23:00",
      event_open_time: "12:00",
      event_close_time: "23:00",
  });
  
  const [localSchedules, setLocalSchedules] = useState<{ day_of_week: number; is_open: boolean; open_time: string; close_time: string }[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");
  const [customEventAmenity, setCustomEventAmenity] = useState("");

  // --- ESTADOS Y FUNCIONES PARA FERIADOS REALES ---
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false); // Estado para controlar el cuadrito del calendario
  const [holidayToDelete, setHolidayToDelete] = useState<{id: string, label: string} | null>(null); // Estado para el modal de borrado

  const { data: holidays = [] } = useHolidays();
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [newHoliday, setNewHoliday] = useState<{ date: Date | undefined, label: string, is_closed: boolean, open_time: string, close_time: string }>({
      date: undefined,
      label: "",
      is_closed: false,
      open_time: "12:00",
      close_time: "23:00"
  });

  const handleAddHoliday = async () => {
      if (!newHoliday.date || !newHoliday.label.trim()) {
          toast({ title: "Atención", description: "Completá el nombre y seleccioná una fecha.", variant: "destructive" });
          return;
      }
      
      try {
          await createHoliday.mutateAsync({
              date: format(newHoliday.date, "yyyy-MM-dd"), // Transformamos la fecha a formato SQL
              label: newHoliday.label,
              is_closed: newHoliday.is_closed,
              custom_open_time: newHoliday.open_time,
              custom_close_time: newHoliday.close_time
          });
          
          toast({ title: "Feriado agendado con éxito ✅" });
          setHolidayModalOpen(false);
          setNewHoliday({ date: undefined, label: "", is_closed: false, open_time: facilityForm.holiday_open_time || "12:00", close_time: facilityForm.holiday_close_time || "23:00" });
      } catch (err: any) {
          toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
      }
  };

  // Función para ejecutar el borrado desde nuestro modal lindo
  const executeDeleteHoliday = async () => {
      if (!holidayToDelete) return;
      try {
          await deleteHoliday.mutateAsync(holidayToDelete.id);
          toast({ title: "Feriado eliminado" });
          setHolidayToDelete(null); // Cerramos el modal
      } catch (err) {
          toast({ title: "Error al eliminar", variant: "destructive" });
      }
  };
  // ---------------------------------------

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const publicUrl = facility?.slug ? `${window.location.origin}/predio/${facility.slug}` : "";

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code && facility?.id) {
      setIsLinkingMP(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const linkAccount = async () => {
        try {
        const { data, error } = await supabase.functions.invoke('mp-connect', {
          body: { 
            code: code, 
            redirectUri: `${window.location.origin}/admin/settings`,
            facilityId: facility.id 
          }
        });

          if (error || !data?.success) throw new Error("Falló la vinculación en el servidor");

          setFacilityForm(prev => ({ ...prev, mp_connected: true }));
          toast({ title: "¡Mercado Pago vinculado! ✅", description: "Ya podés recibir pagos automáticos en tu cuenta." });
        } catch (err: unknown) {
          console.error("Error al invocar Edge Function:", err);
          toast({ title: "Error", description: "No se pudo completar la vinculación con Mercado Pago.", variant: "destructive" });
        } finally {
          setIsLinkingMP(false);
        }
      };

      linkAccount();
    }
  }, [facility?.id]);

  const APP_ID = import.meta.env.VITE_MP_APP_ID;
  const REDIRECT_URI = `${window.location.origin}/admin/settings`;
  const authUrl = `https://auth.mercadopago.com/authorization?client_id=${APP_ID}&response_type=code&platform_id=mp&state=link-account&redirect_uri=${REDIRECT_URI}`;

  useEffect(() => {
    if (facility) {
      setFacilityForm({
        name: facility.name || "",
        location: facility.location || "",
        phone: facility.phone || "",
        email: facility.email || "",
        whatsapp: facility.whatsapp || "",
        description: facility.description || "",
        maps_url: facility.maps_url || "",
        instagram_url: facility.instagram_url || "",
        logo_url: facility.logo_url || "",
        cover_url: facility.cover_url || "",
        amenities: facility.amenities || [],
        requires_deposit: facility.requires_deposit || false,
        deposit_percentage: facility.deposit_percentage || 50,
        mp_connected: facility.mp_connected || false,
        cancellation_window_hours: facility.cancellation_window_hours ?? 12,
        has_events: facility.has_events || false,
        default_event_duration: facility.default_event_duration || 180,
        default_event_includes: facility.default_event_includes || "",
        default_event_price: facility.default_event_price || 0,
        holiday_open_time: facility.holiday_open_time || "12:00",
        holiday_close_time: facility.holiday_close_time || "23:00",
        event_open_time: facility.event_open_time?.slice(0,5) || "12:00",
        event_close_time: facility.event_close_time?.slice(0,5) || "23:00",
      });
    }
  }, [facility]);

  useEffect(() => {
    if (schedules.length > 0) {
      setLocalSchedules(schedules.map((s) => ({ 
          day_of_week: s.day_of_week, 
          is_open: s.is_open, 
          open_time: s.open_time.slice(0, 5), 
          close_time: s.close_time.slice(0, 5) 
      })));
    } else {
      setLocalSchedules(DAYS.map((_, i) => ({ day_of_week: i, is_open: true, open_time: "08:00", close_time: "23:00" })));
    }
  }, [schedules]);

  const updateDay = (dayIdx: number, field: string, value: string | boolean) => {
    setLocalSchedules((prev) => prev.map((s) => s.day_of_week === dayIdx ? { ...s, [field]: value } : s));
  };

  const handleSaveSchedules = async () => {
    try {
      await upsertSchedule.mutateAsync(localSchedules);
      toast({ title: "Horarios guardados ✅" });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Ocurrió un error desconocido";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  };

  const handleSaveFacility = async () => {
    try {
      await updateFacility.mutateAsync(facilityForm as never);
      toast({ title: "Datos del predio guardados ✅" });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Ocurrió un error desconocido";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({ title: "Enlace copiado" });
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleAmenity = (amenity: string) => {
      setFacilityForm(prev => ({
          ...prev,
          amenities: prev.amenities.includes(amenity) ? prev.amenities.filter(a => a !== amenity) : [...prev.amenities, amenity]
      }));
  };

  const handleAddCustomAmenity = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = customAmenity.trim();
      if (!trimmed) return;
      if (!facilityForm.amenities.includes(trimmed)) {
          setFacilityForm(prev => ({ ...prev, amenities: [...prev.amenities, trimmed] }));
      }
      setCustomAmenity(""); 
  };

  const eventAmenities = facilityForm.default_event_includes ? facilityForm.default_event_includes.split(',').map(a => a.trim()).filter(Boolean) : [];
  const allEventOptions = Array.from(new Set([...facilityForm.amenities, ...eventAmenities]));

  const toggleEventAmenity = (amenity: string) => {
      const updated = eventAmenities.includes(amenity)
          ? eventAmenities.filter(a => a !== amenity)
          : [...eventAmenities, amenity];
      setFacilityForm(prev => ({ ...prev, default_event_includes: updated.join(', ') }));
  };

  const handleAddCustomEventAmenity = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = customEventAmenity.trim();
      if (!trimmed) return;
      if (!eventAmenities.includes(trimmed)) {
          const updated = [...eventAmenities, trimmed];
          setFacilityForm(prev => ({ ...prev, default_event_includes: updated.join(', ') }));
      }
      setCustomEventAmenity("");
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { toast({ title: "Debe ser una imagen", variant: "destructive" }); return; }
      try {
          const url = await uploadImage(file, type);
          setFacilityForm(prev => ({ ...prev, [type === 'logo' ? 'logo_url' : 'cover_url']: url }));
          toast({ title: "Imagen subida ✅" });
      } catch (err) {
          console.error(err);
          toast({ title: "Error al subir la imagen", variant: "destructive" });
      } finally {
          event.target.value = '';
      }
  };

  const allAmenities = Array.from(new Set([...PREDEFINED_AMENITIES, ...facilityForm.amenities]));

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-extrabold">Configuración</h1>
            <p className="text-sm text-muted-foreground">Personalizá la vidriera de tu club</p>
        </div>
        <button onClick={handleSaveFacility} disabled={updateFacility.isPending}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm w-full sm:w-auto">
            <Save className="w-4 h-4" /> {updateFacility.isPending ? "Guardando..." : "Guardar todo"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
        
        {/* COLUMNA IZQUIERDA (7 de 12 espacios) */}
        <div className="lg:col-span-7 space-y-6">
            
            {/* LINK PÚBLICO */}
            {publicUrl && (
            <div className="glass-card rounded-2xl p-6 border-2 border-primary/20 bg-primary/5">
                <h3 className="font-bold mb-3 flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" /> Tu link para clientes</h3>
                <div className="flex items-center gap-2">
                <div className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-mono truncate min-w-0 font-medium">
                    {publicUrl}
                </div>
                <button onClick={handleCopyLink} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shrink-0 shadow-sm">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
                </button>
                </div>
            </div>
            )}

            {/* SECCIÓN MERCADO PAGO CONNECT */}
            <div className="glass-card rounded-2xl p-6 border border-[#009EE3]/30 bg-gradient-to-r from-[#009EE3]/5 to-transparent relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#009EE3]/10 rounded-full blur-2xl pointer-events-none" />
                <h3 className="font-bold mb-1 flex items-center gap-2 text-[#009EE3]"><Banknote className="w-5 h-5" /> Integración de Cobros</h3>
                <p className="text-xs text-muted-foreground mb-5">Conectá tu cuenta de Mercado Pago para recibir el dinero de las señas online directamente en tu billetera, sin intermediarios.</p>
                
                {facilityForm.mp_connected ? (
                    <div className="flex items-center justify-between bg-white border border-[#00a650]/30 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#00a650]/10 flex items-center justify-center text-[#00a650]">
                                <Check className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-[#00a650]">Cuenta Vinculada</p>
                                <p className="text-[10px] text-muted-foreground font-medium">Lista para recibir cobros automáticos.</p>
                            </div>
                        </div>
                        <button 
                            onClick={async () => {
                                try {
                                    await updateFacility.mutateAsync({ 
                                        mp_connected: false,
                                        mp_access_token: null,
                                        mp_refresh_token: null,
                                        mp_user_id: null
                                    } as any);
                                    
                                    setFacilityForm(prev => ({
                                        ...prev, 
                                        mp_connected: false,
                                    }));
                                    
                                    toast({ title: "Cuenta desvinculada y datos borrados ✅" });
                                } catch (err) {
                                    toast({ title: "Error", description: "No se pudo desvincular la cuenta.", variant: "destructive" });
                                }
                            }} 
                            className="text-[10px] font-bold text-destructive hover:underline px-2 py-1"
                        >
                            Desvincular
                        </button>
                    </div>
                ) : (
                    <a 
                        href={APP_ID ? authUrl : "#"}
                        onClick={(e) => {
                            if (!APP_ID) {
                                e.preventDefault();
                                toast({ title: "Error", description: "Falta configurar el App ID de Mercado Pago.", variant: "destructive" });
                            }
                        }}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 bg-[#009EE3] hover:bg-[#0089C7] text-white px-5 py-3.5 rounded-xl font-black text-sm transition-colors shadow-md shadow-[#009EE3]/20",
                            isLinkingMP && "opacity-70 pointer-events-none"
                        )}
                    >
                        {isLinkingMP ? "Verificando vinculación..." : "Vincular mi cuenta de Mercado Pago"}
                    </a>
                )}
            </div>

            {/* DISEÑO Y MARCA */}
            <div className="glass-card rounded-2xl p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> Diseño y Marca</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="col-span-1 space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground block">Logo del Club</label>
                        <button onClick={() => logoInputRef.current?.click()} disabled={uploadingImage}
                            className="w-32 h-32 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/50 transition-all overflow-hidden group relative mx-auto sm:mx-0">
                            {facilityForm.logo_url ? (
                                <>
                                    <img src={facilityForm.logo_url} alt="Logo" className="w-full h-full object-contain p-2 bg-white" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload className="w-6 h-6 text-white"/></div>
                                </>
                            ) : (
                                <><Upload className="w-6 h-6 text-muted-foreground mb-2 group-hover:text-primary"/><span className="text-[10px] font-medium text-muted-foreground text-center">Subir Logo<br/>(Cuadrado)</span></>
                            )}
                        </button>
                        <input type="file" accept="image/*" ref={logoInputRef} onChange={(e) => handleImageUpload(e, 'logo')} className="hidden" />
                    </div>

                    <div className="col-span-1 sm:col-span-2 space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground block">Foto de Portada</label>
                        <button onClick={() => coverInputRef.current?.click()} disabled={uploadingImage}
                            className="w-full h-32 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/50 transition-all overflow-hidden group relative">
                            {facilityForm.cover_url ? (
                                <>
                                    <img src={facilityForm.cover_url} alt="Portada" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload className="w-6 h-6 text-white"/></div>
                                </>
                            ) : (
                                <><ImageIcon className="w-6 h-6 text-muted-foreground mb-2 group-hover:text-primary"/><span className="text-[10px] font-medium text-muted-foreground">Subir Portada (Panorámica)</span></>
                            )}
                        </button>
                        <input type="file" accept="image/*" ref={coverInputRef} onChange={(e) => handleImageUpload(e, 'cover')} className="hidden" />
                    </div>
                </div>
            </div>

            {/* INFORMACIÓN PÚBLICA */}
            <div className="glass-card rounded-2xl p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> Información Pública</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Nombre del complejo</label>
                        <input type="text" value={facilityForm.name} onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Descripción corta ("Sobre nosotros")</label>
                        <textarea value={facilityForm.description} onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })} rows={3} placeholder="Bienvenidos a nuestro club..." className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all resize-none" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Dirección exacta</label>
                            <input type="text" value={facilityForm.location} onChange={(e) => setFacilityForm({ ...facilityForm, location: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:border-primary outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1"><Map className="w-3 h-3" /> Link de Google Maps</label>
                            <input type="url" placeholder="https://maps.app.goo.gl/..." value={facilityForm.maps_url} onChange={(e) => setFacilityForm({ ...facilityForm, maps_url: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:border-primary outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp</label>
                            <input type="text" value={facilityForm.whatsapp} onChange={(e) => setFacilityForm({ ...facilityForm, whatsapp: e.target.value })} placeholder="5491112345678" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:border-primary outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1"><Instagram className="w-3 h-3" /> Instagram</label>
                            <input type="text" placeholder="@tu_club" value={facilityForm.instagram_url} onChange={(e) => setFacilityForm({ ...facilityForm, instagram_url: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:border-primary outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono Fijo</label>
                            <input type="tel" value={facilityForm.phone} onChange={(e) => setFacilityForm({ ...facilityForm, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:border-primary outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN HORARIOS DE APERTURA MOVILIZADA ACÁ PARA SIMETRÍA --- */}
            <div className="glass-card rounded-2xl p-6 relative">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold mb-1 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Horarios de Apertura</h3>
                        <p className="text-xs text-muted-foreground">Configurá la apertura y cierre.</p>
                    </div>
                    <button onClick={handleSaveSchedules} disabled={upsertSchedule.isPending}
                        className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg font-bold text-[11px] hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0">
                        <Save className="w-3.5 h-3.5" /> Guardar
                    </button>
                </div>
                
                <div className="space-y-1 mt-4 border border-border rounded-xl overflow-hidden bg-background/20">
                    {DAYS.map((day, idx) => {
                    const sched = localSchedules.find((s) => s.day_of_week === idx);
                    if (!sched) return null;
                    return (
                        <div key={idx} className={cn("flex items-center gap-2 p-2 border-b border-border last:border-0 transition-colors", sched.is_open ? "bg-transparent" : "bg-muted/30 opacity-60")}>
                            <button onClick={() => updateDay(idx, "is_open", !sched.is_open)}
                                className={cn("w-10 h-5 rounded-full transition-colors relative shrink-0 border-2 border-transparent", sched.is_open ? "bg-primary" : "bg-muted-foreground/30")}>
                                <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform", sched.is_open ? "left-[18px]" : "left-0.5")} />
                            </button>
                            <span className="font-bold text-[11px] w-16 shrink-0 truncate">{day}</span>
                            
                            {sched.is_open ? (
                                <div className="flex items-center gap-2 flex-1 justify-end">
                                    <Select value={sched.open_time} onValueChange={(val) => updateDay(idx, "open_time", val)}>
                                        <SelectTrigger className="h-8 w-[100px] text-xs font-bold bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[220px]">
                                            {TIME_OPTIONS.map(time => <SelectItem key={`open-${time}`} value={time} className="text-xs font-bold">{time} hs</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    
                                    <span className="text-[10px] font-semibold text-muted-foreground">a</span>
                                    
                                    <Select value={sched.close_time} onValueChange={(val) => updateDay(idx, "close_time", val)}>
                                        <SelectTrigger className="h-8 w-[100px] text-xs font-bold bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[220px]">
                                            {TIME_OPTIONS.map(time => <SelectItem key={`close-${time}`} value={time} className="text-xs font-bold">{time} hs</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <span className="text-[11px] font-medium text-muted-foreground italic flex-1 text-right pr-2">Cerrado</span>
                            )}
                        </div>
                    );
                    })}
                </div>
            </div>
            {/* ------------------------------------------------------------------- */}

        </div>

        {/* COLUMNA DERECHA (5 de 12 espacios) */}
        <div className="lg:col-span-5 space-y-6">
            
            <div className="glass-card rounded-2xl p-6">
                <h3 className="font-bold mb-2 flex items-center gap-2"><Star className="w-4 h-4 text-primary" /> Servicios del Predio</h3>
                <p className="text-xs text-muted-foreground mb-4">Seleccioná los servicios de tu complejo.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                    {allAmenities.map(amenity => {
                        const isSelected = facilityForm.amenities.includes(amenity);
                        return (
                            <button key={amenity} onClick={() => toggleAmenity(amenity)}
                                className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all", 
                                    isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background/50 border-border text-muted-foreground hover:border-primary/50"
                                )}>
                                {amenity} {isSelected && "✓"}
                            </button>
                        )
                    })}
                </div>
                <form onSubmit={handleAddCustomAmenity} className="flex gap-2 border-t border-border/50 pt-4">
                    <input type="text" value={customAmenity} onChange={e => setCustomAmenity(e.target.value)} placeholder="Ej: Kiosco, Mesas..." className="flex-1 px-3 py-2 rounded-xl border border-input bg-background/50 text-xs focus:border-primary outline-none transition-all" />
                    <button type="submit" disabled={!customAmenity.trim()} className="bg-secondary text-secondary-foreground px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1 transition-opacity">
                        <Plus className="w-3.5 h-3.5"/> Agregar
                    </button>
                </form>
            </div>

            {/* --- SECCIÓN NUEVA: ALQUILER PARA EVENTOS --- */}
            <div className={cn("glass-card rounded-2xl p-6 relative border-t-4 shadow-lg transition-all", facilityForm.has_events ? "border-t-primary bg-primary/5" : "border-t-transparent")}>
                <h3 className="font-bold mb-1 flex items-center gap-2">
                    <PartyPopper className={cn("w-5 h-5", facilityForm.has_events ? "text-primary" : "text-muted-foreground")} /> 
                    Alquiler para Eventos
                </h3>
                <p className="text-xs text-muted-foreground mb-5">Habilitá una sección especial en tu sitio para que los clientes puedan reservar tu predio para cumpleaños.</p>

                <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-sm">Ofrecer servicio de eventos</p>
                            <p className="text-[10px] text-muted-foreground">Mostrará una sección "Eventos" en tu página pública.</p>
                        </div>
                        <button onClick={() => setFacilityForm(prev => ({
                                ...prev, 
                                has_events: !prev.has_events,
                                // HERENCIA AUTOMÁTICA: Si lo activa y está vacío, hereda todos los servicios del predio
                                default_event_includes: (!prev.has_events && !prev.default_event_includes) ? prev.amenities.join(', ') : prev.default_event_includes
                            }))}
                            className={cn("w-12 h-6 rounded-full transition-colors relative shrink-0 border-2 border-transparent", facilityForm.has_events ? "bg-primary" : "bg-muted-foreground/30")}>
                            <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", facilityForm.has_events ? "left-[24px]" : "left-0.5")} />
                        </button>
                    </div>

                    {facilityForm.has_events && (
                        <div className="pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300 space-y-5">
                            
                            {/* --- GRILLA DE 2 COLUMNAS (Duración y Precio) --- */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Timer className="w-3 h-3"/> Duración por defecto (Mínimo)</label>
                                    <Select value={facilityForm.default_event_duration.toString()} onValueChange={(val) => setFacilityForm(prev => ({...prev, default_event_duration: Number(val)}))}>
                                        <SelectTrigger className="w-full h-12 border-2 border-primary/20 rounded-xl px-4 text-sm font-bold bg-background text-primary">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="120" className="font-bold text-xs">2 horas</SelectItem>
                                            <SelectItem value="180" className="font-bold text-xs">3 horas</SelectItem>
                                            <SelectItem value="240" className="font-bold text-xs">4 horas</SelectItem>
                                            <SelectItem value="300" className="font-bold text-xs">5 horas</SelectItem>
                                            <SelectItem value="360" className="font-bold text-xs">6 horas</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Banknote className="w-3 h-3"/> Precio x hora por defecto ($)</label>
                                    <input 
                                        type="number" 
                                        value={facilityForm.default_event_price} 
                                        onChange={(e) => setFacilityForm({ ...facilityForm, default_event_price: Number(e.target.value) })} 
                                        className="w-full h-12 px-4 rounded-xl border-2 border-primary/20 bg-background text-sm font-bold text-primary focus:border-primary outline-none" 
                                    />
                                </div> 
                            </div>

                            {/* --- HORARIO PERMITIDO PARA EVENTOS --- */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Clock className="w-3 h-3"/> Rango horario permitido para eventos</label>
                                <div className="flex items-center gap-3">
                                    <Select value={facilityForm.event_open_time} onValueChange={(val) => setFacilityForm(prev => ({...prev, event_open_time: val}))}>
                                        <SelectTrigger className="w-full h-12 border-2 border-primary/20 rounded-xl px-4 text-sm font-bold bg-background text-primary">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {TIME_OPTIONS.map(t => <SelectItem key={`ev-open-${t}`} value={t}>{t} hs</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-xs font-bold text-muted-foreground">a</span>
                                    <Select value={facilityForm.event_close_time} onValueChange={(val) => setFacilityForm(prev => ({...prev, event_close_time: val}))}>
                                        <SelectTrigger className="w-full h-12 border-2 border-primary/20 rounded-xl px-4 text-sm font-bold bg-background text-primary">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {TIME_OPTIONS.map(t => <SelectItem key={`ev-close-${t}`} value={t}>{t} hs</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-[9px] text-muted-foreground mt-2 text-right">Los clientes no podrán extender sus horas por fuera de este límite.</p>
                            </div>
                            
                            {/* NUEVO DISEÑO DE CHIPS PARA EVENTOS */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Star className="w-3 h-3"/> ¿Qué incluyen tus eventos por defecto?</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {allEventOptions.map(amenity => {
                                        const isSelected = eventAmenities.includes(amenity);
                                        return (
                                            <button key={`evt-${amenity}`} onClick={() => toggleEventAmenity(amenity)}
                                                className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all", 
                                                    isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background/50 border-border text-muted-foreground hover:border-primary/50"
                                                )}>
                                                {amenity} {isSelected && "✓"}
                                            </button>
                                        )
                                    })}
                                </div>
                                <form onSubmit={handleAddCustomEventAmenity} className="flex gap-2">
                                    <input type="text" value={customEventAmenity} onChange={e => setCustomEventAmenity(e.target.value)} placeholder="Ej: Animador, Castillo Inflable..." className="flex-1 px-3 py-2 rounded-xl border border-input bg-background/50 text-xs focus:border-primary outline-none transition-all" />
                                    <button type="submit" disabled={!customEventAmenity.trim()} className="bg-secondary text-secondary-foreground px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1 transition-opacity">
                                        <Plus className="w-3.5 h-3.5"/> Agregar
                                    </button>
                                </form>
                                <p className="text-[9px] text-muted-foreground mt-2 text-right">Esta configuración se aplicará como base a todas las canchas de eventos.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* --- FIN SECCIÓN EVENTOS --- */}

            {/* --- SECCIÓN: CONFIGURACIÓN DE FERIADOS --- */}
            <div className="glass-card rounded-2xl p-6 relative border-t-4 border-t-orange-500 shadow-lg bg-orange-500/5">
                <h3 className="font-bold mb-1 flex items-center gap-2 text-orange-700">
                    <CalendarCheck className="w-5 h-5" /> Gestión de Feriados
                </h3>
                <p className="text-xs text-muted-foreground mb-5">Configurá cómo se comporta el predio los días no laborables.</p>

                <div className="space-y-4">
                    {/* Horario base para cualquier feriado */}
                    <div className="bg-card border border-border rounded-xl p-4">
                        <label className="text-xs font-bold text-muted-foreground mb-3 block">Horario por defecto en Feriados</label>
                        <div className="flex items-center gap-3">
                            <Select value={facilityForm.holiday_open_time} onValueChange={(val) => setFacilityForm({...facilityForm, holiday_open_time: val})}>
                                <SelectTrigger className="h-10 font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t} hs</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <span className="text-xs font-bold">a</span>
                            <Select value={facilityForm.holiday_close_time} onValueChange={(val) => setFacilityForm({...facilityForm, holiday_close_time: val})}>
                                <SelectTrigger className="h-10 font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t} hs</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                            Ezequiel: "Feriado es de {facilityForm.holiday_open_time} a {facilityForm.holiday_close_time}"
                        </p>
                    </div>

                    {/* Botón para abrir el Modal */}
                    <button 
                        onClick={() => {
                            setNewHoliday({ ...newHoliday, open_time: facilityForm.holiday_open_time || "12:00", close_time: facilityForm.holiday_close_time || "23:00" });
                            setHolidayModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Agregar Feriado Específico
                    </button>
                    {/* Lista Dinámica de Feriados */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Feriados Agendados</p>
                        {holidays.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-3 italic bg-background/50 rounded-xl border border-dashed border-border">No hay feriados cargados.</p>
                        ) : (
                            holidays.map(holiday => {
                                const holidayDate = new Date(holiday.date + "T00:00:00"); 
                                return (
                                    <div key={holiday.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl shadow-sm">
                                        <div>
                                            <p className="text-xs font-bold">{holiday.label}</p>
                                            <p className="text-[10px] text-muted-foreground capitalize">{format(holidayDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {holiday.is_closed ? (
                                                <span className="text-[9px] bg-destructive/10 text-destructive px-2 py-0.5 rounded font-bold">CERRADO</span>
                                            ) : (
                                                <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold">{holiday.custom_open_time?.slice(0,5)} - {holiday.custom_close_time?.slice(0,5)}</span>
                                            )}
                                            <button onClick={() => setHolidayToDelete({ id: holiday.id, label: holiday.label })} className="text-destructive p-1 hover:bg-destructive/10 rounded transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-2xl p-6 relative border-t-4 border-t-primary shadow-lg bg-primary/5">
                <h3 className="font-bold mb-1 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Política de Reservas</h3>
                <p className="text-xs text-muted-foreground mb-5">Protegé tus horarios exigiendo una seña online obligatoria y definiendo el tiempo de cancelación.</p>

                <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-sm">Cobrar seña online</p>
                            <p className="text-[10px] text-muted-foreground">Requerir pago parcial en la app para confirmar turno.</p>
                        </div>
                        <button onClick={() => setFacilityForm(prev => ({...prev, requires_deposit: !prev.requires_deposit}))}
                            className={cn("w-12 h-6 rounded-full transition-colors relative shrink-0 border-2 border-transparent", facilityForm.requires_deposit ? "bg-primary" : "bg-muted-foreground/30")}>
                            <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", facilityForm.requires_deposit ? "left-[24px]" : "left-0.5")} />
                        </button>
                    </div>

                    {facilityForm.requires_deposit && (
                        <div className="pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Percent className="w-3 h-3"/> Porcentaje de Seña</label>
                            <Select value={facilityForm.deposit_percentage.toString()} onValueChange={(val) => setFacilityForm(prev => ({...prev, deposit_percentage: Number(val)}))}>
                                <SelectTrigger className="w-full h-12 border-2 border-primary/20 rounded-xl px-4 text-sm font-bold bg-background text-primary">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10" className="font-bold text-xs">10% del valor de la cancha</SelectItem>
                                    <SelectItem value="20" className="font-bold text-xs">20% del valor de la cancha</SelectItem>
                                    <SelectItem value="30" className="font-bold text-xs">30% del valor de la cancha</SelectItem>
                                    <SelectItem value="40" className="font-bold text-xs">40% del valor de la cancha</SelectItem>
                                    <SelectItem value="50" className="font-bold text-xs">50% (Mitad de la cancha)</SelectItem>
                                    <SelectItem value="100" className="font-bold text-xs">100% (Pago completo)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                {/* CONFIGURACIÓN DE CANCELACIONES */}
                <div className="bg-card border border-border rounded-xl p-4 mt-4">
                    <div className="mb-4">
                        <p className="font-bold text-sm">Cancelación de turnos</p>
                        <p className="text-[10px] text-muted-foreground">Tiempo límite de anticipación para que el cliente pueda cancelar su reserva desde la app.</p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Timer className="w-3 h-3"/> Anticipación mínima permitida</label>
                        <Select value={facilityForm.cancellation_window_hours.toString()} onValueChange={(val) => setFacilityForm(prev => ({...prev, cancellation_window_hours: Number(val)}))}>
                            <SelectTrigger className="w-full h-12 border-2 border-primary/20 rounded-xl px-4 text-sm font-bold bg-background text-primary">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2" className="font-bold text-xs">Hasta 2 horas antes</SelectItem>
                                <SelectItem value="4" className="font-bold text-xs">Hasta 4 horas antes</SelectItem>
                                <SelectItem value="12" className="font-bold text-xs">Hasta 12 horas antes</SelectItem>
                                <SelectItem value="24" className="font-bold text-xs">Hasta 24 horas antes</SelectItem>
                                <SelectItem value="48" className="font-bold text-xs">Hasta 48 horas antes</SelectItem>
                                <SelectItem value="168" className="font-bold text-xs">Hasta 1 semana antes</SelectItem>
                                <SelectItem value="0" className="font-bold text-xs">No permitir cancelar (0 horas)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
            
        </div>
      </div>

      {/* MODAL: NUEVO FERIADO */}
      {holidayModalOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" onClick={() => setHolidayModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-4">
              <h3 className="font-extrabold text-xl text-orange-600 flex items-center gap-2"><CalendarCheck className="w-5 h-5"/> Nuevo Feriado</h3>
              <button onClick={() => setHolidayModalOpen(false)} className="p-2 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Nombre / Motivo *</label>
                <input 
                  className="w-full border-2 border-border/50 rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-orange-500 font-semibold" 
                  placeholder="Ej: Navidad, 25 de Mayo"
                  value={newHoliday.label}
                  onChange={e => setNewHoliday({...newHoliday, label: e.target.value})}
                />
              </div>

              {/* Fecha (Calendario Shadcn) */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Fecha *</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button onClick={() => setCalendarOpen(true)} className={cn("w-full border-2 border-border/50 rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-orange-500 font-semibold flex justify-between items-center text-left", !newHoliday.date && "text-muted-foreground")}>
                      {newHoliday.date ? format(newHoliday.date, "PPP", { locale: es }) : "Seleccionar fecha en el calendario"}
                      <CalendarCheck className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[60]" align="center">
                    <Calendar
                      mode="single"
                      selected={newHoliday.date}
                      onSelect={(date) => { 
                          setNewHoliday({...newHoliday, date: date || undefined}); 
                          setCalendarOpen(false); // Magia: Cierra el calendario automáticamente
                      }}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Cerrado o Abierto */}
              <div className="pt-3 border-t border-border/50 mt-2">
                 <div className="flex items-center justify-between mb-3 bg-muted/30 p-3 rounded-xl border border-border">
                     <div>
                        <p className="font-bold text-sm">¿El predio cierra por completo?</p>
                        <p className="text-[10px] text-muted-foreground">Nadie podrá reservar este día.</p>
                     </div>
                     <button onClick={() => setNewHoliday({...newHoliday, is_closed: !newHoliday.is_closed})}
                         className={cn("w-10 h-5 rounded-full transition-colors relative shrink-0 border-2 border-transparent", newHoliday.is_closed ? "bg-destructive" : "bg-muted-foreground/30")}>
                         <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform", newHoliday.is_closed ? "left-[18px]" : "left-0.5")} />
                     </button>
                 </div>

                 {!newHoliday.is_closed && (
                   <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="text-xs font-bold text-muted-foreground">Horario Especial para este día</label>
                      <div className="flex items-center gap-3">
                          <Select value={newHoliday.open_time} onValueChange={val => setNewHoliday({...newHoliday, open_time: val})}>
                              <SelectTrigger className="h-10 font-bold border-2 focus:border-orange-500"><SelectValue /></SelectTrigger>
                              <SelectContent className="z-[60]">{TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t} hs</SelectItem>)}</SelectContent>
                          </Select>
                          <span className="text-xs font-bold">a</span>
                          <Select value={newHoliday.close_time} onValueChange={val => setNewHoliday({...newHoliday, close_time: val})}>
                              <SelectTrigger className="h-10 font-bold border-2 focus:border-orange-500"><SelectValue /></SelectTrigger>
                              <SelectContent className="z-[60]">{TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t} hs</SelectItem>)}</SelectContent>
                          </Select>
                      </div>
                   </div>
                 )}
              </div>
            </div>

            <button onClick={handleAddHoliday} disabled={createHoliday.isPending} className="w-full mt-6 bg-orange-500 text-white py-3.5 rounded-xl font-black text-sm hover:bg-orange-600 transition-opacity disabled:opacity-50 shadow-md">
              Confirmar Día
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE BORRADO PARA FERIADOS */}
      {holidayToDelete && (
        <div className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-border/50">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-xl mb-2">¿Eliminar Feriado?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Estás a punto de eliminar <strong>"{holidayToDelete.label}"</strong>. Esta acción no se puede deshacer.
            </p>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setHolidayToDelete(null)} 
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDeleteHoliday}
                disabled={deleteHoliday.isPending}
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

export default AdminSettings;