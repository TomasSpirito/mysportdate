import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, CalendarDays, Settings, DollarSign, BarChart3, 
  Trophy, Receipt, Users, Coffee, LogOut, Menu, X, ChevronRight,
  Bell, CheckCheck // <-- Agregamos iconos para notificaciones
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFacility } from "@/hooks/use-supabase-data";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, Notification } from "@/hooks/use-notifications"; // <-- Importamos nuestro nuevo hook
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

const QUICK_ACCESS_KEYS = ["/admin", "/admin/schedule", "/admin/cash"];
const quickNavItems = navItems.filter(item => QUICK_ACCESS_KEYS.includes(item.to));

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { data: facility } = useFacility();
  const { signOut } = useAuth();
  
  // Hook de Notificaciones
  const { notifications, unreadCount, markAsRead } = useNotifications();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false); // Estado para el panel lateral de notificaciones

  const facilityName = facility?.name || "Mi Predio";
  const initials = facilityName.charAt(0).toUpperCase();

  // Bloquear el scroll de la página cuando algún menú o panel está abierto
  useEffect(() => {
    if (isMobileMenuOpen || isNotifOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isMobileMenuOpen, isNotifOpen]);

  const isMoreMenuActive = !QUICK_ACCESS_KEYS.includes(location.pathname);

  // Función para darle formato y color a cada notificación según su tipo
  const getNotifDetails = (n: Notification) => {
    switch (n.type) {
      case 'new_booking':
        const startDate = n.content?.start_time ? new Date(n.content.start_time) : null;
        const formattedDate = startDate ? format(startDate, "d 'de' MMM", { locale: es }) : '';
        const hour = startDate ? startDate.getHours() : '';
        return { 
          icon: CalendarDays, color: "text-blue-500", bg: "bg-blue-500/10", 
          title: "Nueva Reserva", 
          desc: `${n.content?.player_name || 'Un cliente'} reservó para el ${formattedDate} a las ${hour}:00hs` 
        };
      case 'cancellation':
        return { 
          icon: X, color: "text-destructive", bg: "bg-destructive/10", 
          title: "Turno Cancelado", desc: "Se ha liberado un lugar en la agenda." 
        };
      case 'buffet_sale':
        return { 
          icon: Coffee, color: "text-orange-500", bg: "bg-orange-500/10", 
          title: "Venta en Buffet", desc: `Ingreso de $${n.content?.total || 0}` 
        };
      default:
        return { 
          icon: Bell, color: "text-primary", bg: "bg-primary/10", 
          title: "Notificación", desc: "Tenés una novedad en el sistema." 
        };
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-secondary text-secondary-foreground border-r border-sidebar-border shrink-0">
        {/* Cabecera del Sidebar con la Campana */}
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3 min-w-0">
            {facility?.logo_url ? (
                <div className="w-10 h-10 shrink-0 overflow-hidden rounded-xl flex items-center justify-center bg-white">
                    <img src={facility.logo_url} alt="Logo" className="w-full h-full object-contain" />
                </div>
            ) : (
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg shrink-0 shadow-inner">
                    {initials}
                </div>
            )}
            <div className="min-w-0">
              <span className="font-bold text-lg tracking-tight block truncate">{facilityName}</span>
              <span className="text-xs text-sidebar-foreground opacity-60">Panel Admin</span>
            </div>
          </Link>

          {/* Botón de Campana Desktop */}
          <button onClick={() => setIsNotifOpen(true)} className="relative p-2 rounded-xl hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-secondary" />
            )}
          </button>
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="bg-background w-full rounded-t-3xl relative z-10 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-border/50">
              <h2 className="text-xl font-extrabold text-foreground">Opciones</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
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

      {/* ─── SLIDE-OVER DE NOTIFICACIONES ─── */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsNotifOpen(false)} />
          
          <div className="relative w-full max-w-md bg-background h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-border">
            
            {/* Header del Panel */}
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary text-primary-foreground rounded-xl shadow-sm">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-lg leading-none">Notificaciones</h2>
                  <p className="text-xs text-muted-foreground mt-1">{unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}</p>
                </div>
              </div>
              <button onClick={() => setIsNotifOpen(false)} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Notificaciones */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-muted/10">
              {notifications.length === 0 ? (
                <div className="text-center py-20 opacity-50 flex flex-col items-center">
                  <CheckCheck className="w-12 h-12 mb-3 text-muted-foreground" />
                  <p className="font-bold">No hay notificaciones</p>
                  <p className="text-xs">Los movimientos de tu predio aparecerán aquí.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const details = getNotifDetails(n);
                  return (
                    <div 
                      key={n.id} 
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      className={cn(
                        "relative p-4 rounded-2xl border transition-all cursor-pointer",
                        n.is_read 
                          ? "bg-card border-border/50 opacity-70" 
                          : "bg-background border-primary/20 shadow-sm hover:border-primary/40"
                      )}
                    >
                      {!n.is_read && (
                        <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
                      )}
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-xl mt-1 shrink-0", details.bg, details.color)}>
                          <details.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className={cn("text-sm font-bold truncate", !n.is_read && "text-foreground")}>{details.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{details.desc}</p>
                          <p className="text-[10px] font-medium text-muted-foreground/60 mt-2">
                            {format(new Date(n.created_at || Date.now()), "d 'de' MMM, HH:mm'hs'", { locale: es })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:pb-0 pb-20 min-w-0 relative">
        {/* Mobile Header (Ahora con Campana) */}
        <header className="lg:hidden sticky top-0 z-30 bg-secondary/95 backdrop-blur-md text-secondary-foreground border-b border-sidebar-border shadow-sm">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3 min-w-0">
              {facility?.logo_url ? (
                  <div className="w-8 h-8 shrink-0 overflow-hidden rounded-lg flex items-center justify-center bg-white">
                      <img src={facility.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  </div>
              ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm shrink-0 shadow-inner">
                      {initials}
                  </div>
              )}
              <span className="font-bold text-lg tracking-tight truncate">{facilityName}</span>
            </div>
            
            {/* Botón de Campana Mobile */}
            <button onClick={() => setIsNotifOpen(true)} className="relative p-2 rounded-xl hover:bg-secondary-accent transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-secondary" />
              )}
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;