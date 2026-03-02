import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useFacility, useUpdateFacility, useFacilitySchedules, useUpsertFacilitySchedule } from "@/hooks/use-supabase-data";
import { Clock, MapPin, Phone, Globe, Save, Mail, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const AdminSettings = () => {
  const { data: facility } = useFacility();
  const updateFacility = useUpdateFacility();
  const { data: schedules = [] } = useFacilitySchedules();
  const upsertSchedule = useUpsertFacilitySchedule();

  const [facilityForm, setFacilityForm] = useState({ name: "", location: "", phone: "", email: "", whatsapp: "" });
  const [localSchedules, setLocalSchedules] = useState<{ day_of_week: number; is_open: boolean; open_time: string; close_time: string }[]>([]);

  useEffect(() => {
    if (facility) {
      setFacilityForm({
        name: facility.name || "",
        location: facility.location || "",
        phone: facility.phone || "",
        email: facility.email || "",
        whatsapp: facility.whatsapp || "",
      });
    }
  }, [facility]);

  useEffect(() => {
    if (schedules.length > 0) {
      setLocalSchedules(schedules.map((s) => ({ day_of_week: s.day_of_week, is_open: s.is_open, open_time: s.open_time, close_time: s.close_time })));
    } else {
      setLocalSchedules(DAYS.map((_, i) => ({ day_of_week: i, is_open: true, open_time: "08:00", close_time: "23:00" })));
    }
  }, [schedules]);

  const updateDay = (dayIdx: number, field: string, value: any) => {
    setLocalSchedules((prev) => prev.map((s) => s.day_of_week === dayIdx ? { ...s, [field]: value } : s));
  };

  const handleSaveSchedules = async () => {
    try {
      await upsertSchedule.mutateAsync(localSchedules);
      toast({ title: "Horarios guardados" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleSaveFacility = async () => {
    try {
      await updateFacility.mutateAsync({
        name: facilityForm.name,
        location: facilityForm.location,
        phone: facilityForm.phone,
        email: facilityForm.email,
        whatsapp: facilityForm.whatsapp,
      } as any);
      toast({ title: "Datos del predio guardados" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Datos del predio y preferencias</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Información del predio</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Nombre del complejo</label>
              <input type="text" value={facilityForm.name} onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Dirección</label>
              <input type="text" value={facilityForm.location} onChange={(e) => setFacilityForm({ ...facilityForm, location: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</label>
                <input type="tel" value={facilityForm.phone} onChange={(e) => setFacilityForm({ ...facilityForm, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</label>
                <input type="email" value={facilityForm.email} onChange={(e) => setFacilityForm({ ...facilityForm, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp (número sin + ni espacios, ej: 5491112345678)</label>
              <input type="text" value={facilityForm.whatsapp} onChange={(e) => setFacilityForm({ ...facilityForm, whatsapp: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm" placeholder="5491112345678" />
            </div>
          </div>
          <button onClick={handleSaveFacility} disabled={updateFacility.isPending}
            className="mt-4 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            <Save className="w-4 h-4" /> {updateFacility.isPending ? "Guardando..." : "Guardar datos"}
          </button>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Horarios por día</h3>
          <p className="text-xs text-muted-foreground mb-4">Configurá los horarios de apertura y cierre para cada día de la semana</p>
          <div className="space-y-2">
            {DAYS.map((day, idx) => {
              const sched = localSchedules.find((s) => s.day_of_week === idx);
              if (!sched) return null;
              return (
                <div key={idx} className={cn("flex items-center gap-3 p-3 rounded-xl transition-colors", sched.is_open ? "bg-muted/30" : "bg-muted/10 opacity-60")}>
                  <button onClick={() => updateDay(idx, "is_open", !sched.is_open)}
                    className={cn("w-10 h-6 rounded-full transition-colors relative", sched.is_open ? "bg-primary" : "bg-muted")}>
                    <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform", sched.is_open ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <span className="font-semibold text-sm w-24">{day}</span>
                  {sched.is_open ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input type="time" value={sched.open_time} onChange={(e) => updateDay(idx, "open_time", e.target.value)}
                        className="border border-border rounded-lg px-2 py-1.5 text-sm bg-transparent outline-none focus:border-primary w-28" />
                      <span className="text-xs text-muted-foreground">a</span>
                      <input type="time" value={sched.close_time} onChange={(e) => updateDay(idx, "close_time", e.target.value)}
                        className="border border-border rounded-lg px-2 py-1.5 text-sm bg-transparent outline-none focus:border-primary w-28" />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Cerrado</span>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={handleSaveSchedules} disabled={upsertSchedule.isPending}
            className="mt-4 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            <Save className="w-4 h-4" /> {upsertSchedule.isPending ? "Guardando..." : "Guardar horarios"}
          </button>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-bold mb-4">Seña por defecto</h3>
          <div className="flex items-center gap-3">
            <input type="number" defaultValue="40" className="w-24 px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
            <span className="text-sm text-muted-foreground">% del total</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
