import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  BookX,
  ShieldCheck,
  LinkIcon,
  BarChart3,
  Wallet,
  Trophy,
  Users,
  Menu,
  X,
  CalendarCheck,
  Settings,
  Share2,
  MessageCircle,
  ChevronRight,
  Clock,
  Smartphone,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Landing = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-secondary text-secondary-foreground font-sans">
      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 bg-secondary/80 backdrop-blur-lg border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-base">
              S
            </div>
            <span className="font-extrabold text-lg">Spordate</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-secondary-foreground/70">
            <button onClick={() => scrollTo("beneficios")} className="hover:text-primary transition-colors">Beneficios</button>
            <button onClick={() => scrollTo("caracteristicas")} className="hover:text-primary transition-colors">Características</button>
            <button onClick={() => scrollTo("como-funciona")} className="hover:text-primary transition-colors">Cómo funciona</button>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate("/auth/login")}
              className="text-sm font-semibold text-secondary-foreground/80 hover:text-primary transition-colors px-4 py-2">
              Ingresar
            </button>
            <button onClick={() => navigate("/auth/login")}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
              Empezar Gratis
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="md:hidden bg-secondary border-t border-border/30 px-6 pb-6 space-y-4">
            <button onClick={() => scrollTo("beneficios")} className="block w-full text-left py-2 text-sm font-medium text-secondary-foreground/70 hover:text-primary">Beneficios</button>
            <button onClick={() => scrollTo("caracteristicas")} className="block w-full text-left py-2 text-sm font-medium text-secondary-foreground/70 hover:text-primary">Características</button>
            <button onClick={() => scrollTo("como-funciona")} className="block w-full text-left py-2 text-sm font-medium text-secondary-foreground/70 hover:text-primary">Cómo funciona</button>
            <hr className="border-border/30" />
            <button onClick={() => navigate("/auth/login")} className="block w-full text-left py-2 text-sm font-semibold text-secondary-foreground/80">Ingresar</button>
            <button onClick={() => navigate("/auth/login")}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm">
              Empezar Gratis
            </button>
          </motion.div>
        )}
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="container py-20 md:py-28 flex flex-col items-center text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-block bg-primary/15 text-primary text-xs font-bold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
              Plataforma #1 para predios deportivos
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible"
            className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight mb-5 leading-tight max-w-3xl">
            Gestioná tu predio{" "}
            <span className="text-gradient-brand">como un profesional</span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible"
            className="text-base sm:text-lg text-secondary-foreground/60 max-w-xl mx-auto mb-8">
            Reservas online, turnos fijos, control de caja, gastos y analíticas.
            Todo en una plataforma pensada para complejos deportivos de Argentina.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible" className="flex flex-col sm:flex-row gap-4 mb-14">
            <button onClick={() => navigate("/auth/login")}
              className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 justify-center">
              Crear cuenta gratis <ChevronRight size={16} />
            </button>
            <button onClick={() => scrollTo("como-funciona")}
              className="border border-border/50 text-secondary-foreground/80 px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-secondary-foreground/5 transition-colors">
              Ver cómo funciona
            </button>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible"
            className="relative w-full max-w-4xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent rounded-3xl blur-2xl" />
            <div className="relative bg-sidebar rounded-2xl border border-sidebar-border shadow-2xl overflow-hidden">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-primary/60" />
                <span className="ml-3 text-xs text-sidebar-foreground/50 font-medium">spordate.com/admin</span>
              </div>
              {/* Mock content */}
              <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: "Reservas hoy", value: "24", color: "bg-primary/20 text-primary" },
                  { label: "Ingresos mes", value: "$1.2M", color: "bg-accent/20 text-accent" },
                  { label: "Ocupación", value: "87%", color: "bg-info/20 text-info" },
                  { label: "Clientes", value: "312", color: "bg-warning/20 text-warning" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-sidebar-accent rounded-xl p-3 md:p-4">
                    <p className="text-[10px] md:text-xs text-sidebar-foreground/50 font-medium mb-1">{stat.label}</p>
                    <p className={`text-lg md:text-2xl font-extrabold ${stat.color} bg-transparent`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              {/* Mock grid */}
              <div className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="bg-sidebar-accent rounded-xl p-3 md:p-4 h-28 md:h-40 flex items-end gap-2">
                  {[60, 80, 45, 90, 70, 55, 85, 75, 95, 50, 65, 88].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary/30 rounded-t-md" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Beneficios ─── */}
      <section id="beneficios" className="bg-background py-20 md:py-28">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-primary text-sm font-bold uppercase tracking-widest">Beneficios</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground mt-3">
              El fin de los problemas de siempre
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: BookX,
                title: "Adiós al papel y lápiz",
                desc: "Centralizá todo en la nube y evitá turnos dobles, confusiones y pérdidas de información. Tu agenda siempre actualizada.",
              },
              {
                icon: ShieldCheck,
                title: "Reducí el ausentismo",
                desc: "Cobrá señas online por Mercado Pago y asegurá tus ingresos. Si no pagan la seña, el turno se libera automáticamente.",
              },
              {
                icon: LinkIcon,
                title: "Tu propia página web",
                desc: "Un link único para que tus clientes reserven 24/7 sin escribirte por WhatsApp. Compartilo y recibí reservas mientras dormís.",
              },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i + 1}
                initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
                className="group bg-card rounded-2xl border border-border p-8 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="text-primary" size={28} />
                </div>
                <h3 className="text-lg font-bold text-card-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Características (Bento Grid) ─── */}
      <section id="caracteristicas" className="bg-secondary py-20 md:py-28">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-primary text-sm font-bold uppercase tracking-widest">Características</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-3">
              Todo lo que necesitás, en un solo lugar
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5">
            {/* Large card */}
            <motion.div variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="md:col-span-4 bg-sidebar-accent rounded-2xl border border-sidebar-border p-6 md:p-8 flex flex-col justify-between min-h-[200px] group hover:border-primary/30 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
                  <BarChart3 className="text-primary" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">Estadísticas en tiempo real</h3>
                <p className="text-sm text-sidebar-foreground/60 max-w-md">
                  Visualizá tu ocupación, ingresos diarios, turnos más populares y tendencias. Tomá decisiones basadas en datos, no en intuición.
                </p>
              </div>
              <div className="flex gap-2 mt-6">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d, i) => (
                  <div key={d} className="flex-1 text-center">
                    <div className="bg-primary/20 rounded-md mx-auto mb-1"
                      style={{ height: `${30 + Math.random() * 50}px`, maxWidth: "100%" }} />
                    <span className="text-[10px] text-sidebar-foreground/40">{d}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Small card */}
            <motion.div variants={fadeUp} custom={2} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="md:col-span-2 bg-sidebar-accent rounded-2xl border border-sidebar-border p-6 md:p-8 group hover:border-accent/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
                <Wallet className="text-accent" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Control de Caja y Gastos</h3>
              <p className="text-sm text-sidebar-foreground/60">
                Registrá ingresos, egresos (luz, agua, sueldos) y visualizá tu balance real al instante.
              </p>
            </motion.div>

            {/* Small card */}
            <motion.div variants={fadeUp} custom={3} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="md:col-span-2 bg-sidebar-accent rounded-2xl border border-sidebar-border p-6 md:p-8 group hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
                <Trophy className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Soporte Multi-deporte</h3>
              <p className="text-sm text-sidebar-foreground/60">
                Fútbol 5, 7, 11, Pádel, Tenis, Hockey, Básquet y más. Configurá los deportes que ofrecés en tu predio.
              </p>
            </motion.div>

            {/* Large card */}
            <motion.div variants={fadeUp} custom={4} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="md:col-span-4 bg-sidebar-accent rounded-2xl border border-sidebar-border p-6 md:p-8 flex flex-col justify-between min-h-[200px] group hover:border-accent/30 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
                  <Users className="text-accent" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">Base de datos de tus jugadores</h3>
                <p className="text-sm text-sidebar-foreground/60 max-w-md">
                  Conocé a tus clientes: quién reserva más, quién cancela, histórico de turnos. Fidelizá con datos reales.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-primary/20 border-2 border-sidebar-accent -ml-2 first:ml-0 flex items-center justify-center text-xs font-bold text-primary/60">
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
                <span className="text-xs text-sidebar-foreground/40 ml-1">+306 más</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Cómo funciona ─── */}
      <section id="como-funciona" className="bg-background py-20 md:py-28">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-primary text-sm font-bold uppercase tracking-widest">Cómo funciona</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground mt-3">
              Tan fácil como hacer un gol
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                step: "01",
                icon: CalendarCheck,
                title: "Registrá tu predio",
                desc: "Creá tu cuenta gratis en menos de 2 minutos. Sin tarjeta de crédito, sin contratos.",
              },
              {
                step: "02",
                icon: Settings,
                title: "Configurá horarios y precios",
                desc: "Definí tus canchas, deportes, horarios por día y precios. Todo desde un panel súper intuitivo.",
              },
              {
                step: "03",
                icon: Share2,
                title: "Compartí tu link por WhatsApp",
                desc: "Mandá tu link personalizado a tus clientes y empezá a recibir reservas al instante. Así de simple.",
              },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i + 1}
                initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
                className="relative text-center md:text-left">
                <span className="text-6xl md:text-7xl font-extrabold text-primary/10 absolute -top-4 -left-2 md:-left-4 select-none">
                  {item.step}
                </span>
                <div className="relative pt-8">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 mx-auto md:mx-0">
                    <item.icon className="text-primary" size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Final ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-primary/20 to-secondary" />
        <div className="container relative py-20 md:py-28 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
            <motion.h2 variants={fadeUp} custom={0}
              className="text-2xl sm:text-3xl md:text-5xl font-extrabold max-w-2xl mx-auto mb-5 leading-tight">
              ¿Listo para modernizar tu complejo?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1}
              className="text-base sm:text-lg text-secondary-foreground/60 max-w-lg mx-auto mb-8">
              Empezá a usar Spordate hoy mismo. Sin costo inicial, sin compromiso. Tu predio lo merece.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <button onClick={() => navigate("/auth/login")}
                className="bg-primary text-primary-foreground px-10 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                Crear cuenta gratis <ChevronRight size={18} />
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-secondary border-t border-border/20 py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm">S</div>
            <span className="font-extrabold text-base">Spordate</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-secondary-foreground/50">
            <a href="#" className="hover:text-primary transition-colors">Términos</a>
            <a href="#" className="hover:text-primary transition-colors">Privacidad</a>
            <a href="#" className="hover:text-primary transition-colors">Soporte</a>
            <span>contacto@spordate.com</span>
          </div>
          <p className="text-xs text-secondary-foreground/30">© {new Date().getFullYear()} Spordate. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* ─── Floating WhatsApp ─── */}
      <a href="https://wa.me/5491100000000" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[hsl(142,70%,45%)] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200"
        aria-label="Contactar por WhatsApp">
        <MessageCircle className="text-primary-foreground" size={26} />
      </a>
    </div>
  );
};

export default Landing;
