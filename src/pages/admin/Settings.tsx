import AdminLayout from "@/components/layout/AdminLayout";
import { Clock, MapPin, Phone, Globe } from "lucide-react";

const AdminSettings = () => {
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
              <input type="text" defaultValue="Complejo Spordate" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Dirección</label>
              <input type="text" defaultValue="Av. del Libertador 1234, San Isidro" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</label>
                <input type="tel" defaultValue="+54 11 4567-8901" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Web</label>
                <input type="url" defaultValue="https://spordate.com" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Horarios de operación</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Apertura</label>
              <input type="time" defaultValue="08:00" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Cierre</label>
              <input type="time" defaultValue="23:00" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-bold mb-4">Seña por defecto</h3>
          <div className="flex items-center gap-3">
            <input type="number" defaultValue="40" className="w-24 px-4 py-2.5 rounded-xl border border-input bg-background text-sm" />
            <span className="text-sm text-muted-foreground">% del total</span>
          </div>
        </div>

        <button className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
          Guardar cambios
        </button>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
