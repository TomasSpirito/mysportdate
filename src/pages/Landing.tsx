import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Landing = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-secondary text-secondary-foreground flex flex-col">
      <header className="container py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg">S</div>
          <span className="font-extrabold text-xl">Spordate</span>
        </div>
        <button onClick={() => navigate("/auth/login")}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
          Ingresar
        </button>
      </header>
      <main className="flex-1 container flex flex-col items-center justify-center text-center py-20 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            Gestioná tu predio<br />
            <span className="text-gradient-brand">como un profesional</span>
          </h1>
          <p className="text-base sm:text-lg text-sidebar-foreground opacity-70 max-w-lg mx-auto mb-8">
            Reservas online, turnos fijos, control de caja y analíticas. Todo en una plataforma.
          </p>
          <button onClick={() => navigate("/auth/login")}
            className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
            Empezar gratis
          </button>
        </motion.div>
      </main>
    </div>
  );
};

export default Landing;
