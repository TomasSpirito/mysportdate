import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, CalendarDays, Settings, DollarSign, BarChart3, 
  Trophy, Receipt, Users, Coffee, LogOut, Menu, X, ChevronRight 
} from "lucide-react";
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

// Accesos rápidos para la barra inferior mobile
const QUICK_ACCESS_KEYS = ["/admin", "/admin/schedule", "/admin/cash"];
const quickNavItems = navItems.filter(item => QUICK_ACCESS_KEYS.includes(item.to));

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { data: facility } = useFacility();
  const { signOut } = useAuth();
  
  // Estado para controlar el Bottom Sheet en mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const facilityName = facility?.name || "Mi Predio";
  const initials = facilityName.charAt(0).toUpperCase();

  // Bloquear el scroll de la página cuando el menú está abierto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isMobileMenuOpen]);

  // Saber si estamos parados en una sección que está dentro del menú "Más"
  const isMoreMenuActive = !QUICK_ACCESS_KEYS.includes(location.pathname);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-secondary text-secondary-foreground border-r border-sidebar-border shrink-0">
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/admin" className="flex items-center gap-3">
            {facility?.logo_url ? (
                <div className="w-10 h-10 shrink-0 overflow-hidden rounded-xl flex items-center justify-center">
                    <img src={facility.logo_url} alt="Logo" className="w-full h-full object-contain" />
                </div>
            ) : (
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg shrink-0 border border-primary/20 shadow-inner">
                    {initials}
                </div>
            )}
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

      {/* ─── MOBILE BOTTOM NAV (Quick Access) ─── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-secondary/95 backdrop-blur-xl border-t border-border pb-2 pt-1">
        <nav className="flex justify-around items-center h-14 px-2">
          {quickNavItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}
                className={cn("flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                {isActive && <span className="absolute top-0 w-1 h-1 rounded-full bg-primary" />}
                <item.icon className={cn("w-5 h-5", isActive && "fill-primary/20 stroke-[2.5px]")} />
                <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Botón de "Más" (Hamburguesa) */}
          <button onClick={() => setIsMobileMenuOpen(true)}
            className={cn("flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors relative",
              isMoreMenuActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            {isMoreMenuActive && <span className="absolute top-0 w-1 h-1 rounded-full bg-primary" />}
            <Menu className={cn("w-5 h-5", isMoreMenuActive && "stroke-[2.5px]")} />
            <span className="text-[10px] font-bold tracking-tight">Más</span>
          </button>
        </nav>
      </div>

      {/* ─── MOBILE BOTTOM SHEET (Menú Deslizable) ─── */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Overlay oscuro para cerrar al tocar afuera */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          
          {/* Contenedor del menú */}
          <div className="bg-background w-full rounded-t-3xl relative z-10 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            
            {/* Cabecera del Bottom Sheet */}
            <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-border/50">
              <h2 className="text-xl font-extrabold text-foreground">Opciones</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de navegación completa */}
            <div className="overflow-y-auto px-4 py-4 space-y-2 scrollbar-none">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link key={item.to} to={item.to} onClick={() => setIsMobileMenuOpen(false)}
                    className={cn("flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all",
                      isActive ? "bg-primary text-primary-foreground shadow-md" : "bg-card border border-border/50 text-foreground hover:bg-muted"
                    )}>
                    <item.icon className="w-5 h-5" />
                    {item.label}
                    {!isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-30" />}
                  </Link>
                );
              })}
            </div>

            {/* Footer del menú (Sesión) */}
            <div className="p-6 border-t border-border/50 bg-card rounded-t-xl mt-auto space-y-3">
               {facility?.slug && (
                 <Link to={`/predio/${facility.slug}`} className="flex items-center justify-center w-full gap-2 px-4 py-3.5 rounded-xl bg-muted border border-border text-sm font-bold text-foreground hover:bg-muted/80">
                   Ver página pública del predio
                 </Link>
               )}
               <button onClick={() => { setIsMobileMenuOpen(false); signOut(); }} className="flex items-center justify-center w-full gap-2 px-4 py-3.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-colors">
                 <LogOut className="w-4 h-4" /> Cerrar sesión
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:pb-0 pb-20 min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-secondary/95 backdrop-blur-md text-secondary-foreground border-b border-sidebar-border shadow-sm">
          <div className="flex items-center h-14 px-4 gap-3">
            {facility?.logo_url ? (
                <div className="w-8 h-8 shrink-0 overflow-hidden rounded-lg flex items-center justify-center bg-white">
                    <img src={facility.logo_url} alt="Logo" className="w-full h-full object-contain" />
                </div>
            ) : (
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm shrink-0 border border-primary/20 shadow-inner">
                    {initials}
                </div>
            )}
            <span className="font-bold text-lg tracking-tight truncate">{facilityName}</span>
          </div>
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;