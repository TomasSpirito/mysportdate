import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarDays, Settings, DollarSign, BarChart3, Trophy, Receipt, Users, Coffee, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFacility } from "@/hooks/use-supabase-data";
import { useAuth } from "@/contexts/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/courts", icon: Trophy, label: "Canchas" },
  { to: "/admin/schedule", icon: CalendarDays, label: "Agenda" },
  { to: "/admin/cash", icon: DollarSign, label: "Caja" },
  { to: "/admin/expenses", icon: Receipt, label: "Gastos" },
  { to: "/admin/players", icon: Users, label: "Jugadores" },
  { to: "/admin/buffet", icon: Coffee, label: "Buffet" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analíticas" },
  { to: "/admin/settings", icon: Settings, label: "Config" },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { data: facility } = useFacility();
  const { signOut } = useAuth();
  const facilityName = facility?.name || "Mi Predio";
  const initials = facilityName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-secondary text-secondary-foreground border-r border-sidebar-border shrink-0">
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-lg tracking-tight block truncate">{facilityName}</span>
              <span className="text-xs text-sidebar-foreground opacity-60">Panel Admin</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
                <item.icon className="w-4 h-4" />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {facility?.slug && (
            <Link to={`/predio/${facility.slug}`} className="flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground opacity-60 hover:opacity-100 transition-opacity">
              ← Ver como jugador
            </Link>
          )}
          <button onClick={() => signOut()} className="flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground opacity-60 hover:opacity-100 transition-opacity w-full text-left">
            <LogOut className="w-3 h-3" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-secondary border-t border-sidebar-border">
        <nav className="flex justify-around py-2 px-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}
                className={cn("flex flex-col items-center gap-0.5 px-1 py-1 text-[9px] font-medium transition-colors min-w-0",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground opacity-60")}>
                <item.icon className="w-4 h-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:pb-0 pb-16 min-w-0">
        <header className="lg:hidden sticky top-0 z-40 bg-secondary text-secondary-foreground border-b border-sidebar-border">
          <div className="flex items-center h-14 px-4 gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm shrink-0">{initials}</div>
            <span className="font-bold text-lg tracking-tight truncate">{facilityName}</span>
            <button onClick={() => signOut()} className="ml-auto p-2 text-sidebar-foreground opacity-60 hover:opacity-100 shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
