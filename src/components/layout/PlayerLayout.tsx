import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";
import { motion } from "framer-motion"; // <-- 1. Importamos framer-motion

interface PlayerLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  backTo?: string;
}

const PlayerLayout = ({ children, title, showBack = false, backTo }: PlayerLayoutProps) => {
  const { slug } = useParams<{ slug?: string }>();
  const facilityHome = slug ? `/predio/${slug}` : "/";
  const resolvedBackTo = backTo || facilityHome;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      
      {/* Header global de la Plataforma */}
      <header className="sticky top-0 z-50 bg-secondary text-secondary-foreground border-b border-border/40 shadow-sm shrink-0">
        <div className="container flex items-center h-14 gap-3 px-4 max-w-5xl mx-auto">
          
          {showBack && (
            <Link to={resolvedBackTo} className="p-1.5 -ml-1.5 rounded-lg hover:bg-background/50 transition-colors shrink-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          
          {/* Marca: MySportdate */}
          <Link to="/" className="flex items-center gap-2 min-w-0 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0 group-hover:scale-105 transition-transform shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-black text-lg tracking-tight truncate group-hover:text-primary transition-colors">
              MySportdate
            </span>
          </Link>

          {/* Lado derecho: Slogan SIEMPRE VISIBLE + Título (si existe) */}
          <div className="ml-auto flex items-center shrink-0">
            <span className="hidden sm:block text-xs font-semibold text-muted-foreground italic tracking-wide">
              Tu deporte, a un clic.
            </span>
            {title && (
              <span className="text-sm font-bold text-foreground opacity-90 truncate max-w-[120px] sm:max-w-[200px] sm:border-l sm:border-border/50 sm:pl-3 sm:ml-3">
                {title}
              </span>
            )}
          </div>

        </div>
      </header>

      {/* NUEVO: 2. Animamos el contenedor principal de todas las páginas */}
      <motion.main 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex-1 flex flex-col"
      >
        {children}
      </motion.main>

      {/* Footer de MySportdate */}
      <footer className="bg-secondary text-secondary-foreground border-t border-border/40 py-8 shrink-0 mt-auto">
        <div className="container max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-black text-lg tracking-tight">MySportdate</span>
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-muted-foreground font-medium">
            <a href="#" className="hover:text-primary transition-colors">Términos</a>
            <a href="#" className="hover:text-primary transition-colors">Privacidad</a>
            <a href="#" className="hover:text-primary transition-colors">Soporte</a>
            <a href="mailto:contacto@mysportdate.com" className="hover:text-primary transition-colors">contacto@mysportdate.com</a>
          </div>

          <div className="text-xs text-muted-foreground text-center md:text-right">
            © {new Date().getFullYear()} MySportdate.<br className="hidden md:block lg:hidden"/> Todos los derechos reservados.
          </div>

        </div>
      </footer>

    </div>
  );
};

export default PlayerLayout;