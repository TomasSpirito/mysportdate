import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useFacility } from "@/hooks/use-supabase-data";

interface PlayerLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  backTo?: string;
}

const PlayerLayout = ({ children, title, showBack = false, backTo = "/" }: PlayerLayoutProps) => {
  const { data: facility } = useFacility();
  const facilityName = facility?.name || "Mi Predio";
  const initials = facilityName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-secondary text-secondary-foreground">
        <div className="container flex items-center h-14 gap-3">
          {showBack && (
            <Link to={backTo} className="p-1 -ml-1 rounded-md hover:bg-sidebar-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm">
              {initials}
            </div>
            <span className="font-bold text-lg tracking-tight">{facilityName}</span>
          </Link>
          {title && <span className="ml-auto text-sm font-medium text-sidebar-foreground">{title}</span>}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};

export default PlayerLayout;
