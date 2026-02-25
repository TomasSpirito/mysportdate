import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useCourts, useSports, useAddons } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { Plus, Edit2, Trash2, Trophy, Settings } from "lucide-react";

const AdminCourts = () => {
  const [activeTab, setActiveTab] = useState<"courts" | "sports" | "addons">("courts");
  const { data: courts = [] } = useCourts();
  const { data: sports = [] } = useSports();
  const { data: addons = [] } = useAddons();

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Gestión de Canchas</h1>
        <p className="text-sm text-muted-foreground">Administrá canchas, deportes y extras</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6 w-fit">
        {[
          { key: "courts" as const, label: "Canchas", icon: Trophy },
          { key: "sports" as const, label: "Deportes", icon: Settings },
          { key: "addons" as const, label: "Extras", icon: Plus },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "courts" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">{courts.length} canchas</span>
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Nueva cancha
            </button>
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
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {court.features.map((f) => (
                        <span key={f} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-primary">${court.price_per_hour.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">/hora</p>
                    <div className="flex gap-1 mt-2">
                      <button className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Nuevo deporte
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sports.map((sport) => {
              const sportCourts = courts.filter((c) => c.sport_id === sport.id);
              return (
                <div key={sport.id} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                  <span className="text-4xl">{sport.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-bold">{sport.name}</h3>
                    <p className="text-xs text-muted-foreground">{sportCourts.length} canchas</p>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "addons" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">{addons.length} extras</span>
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Nuevo extra
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addons.map((addon) => (
              <div key={addon.id} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                <span className="text-3xl">{addon.icon}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{addon.name}</h3>
                  <p className="text-xs text-primary font-semibold">${addon.price.toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCourts;
