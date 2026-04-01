import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useState, useRef, ReactNode } from "react";
import {
  BookX, ShieldCheck, LinkIcon, BarChart3, Wallet, Trophy, Users, Menu, X,
  CalendarCheck, Settings, Share2, MessageCircle, ChevronRight, CheckCircle2,
  Coffee, ArrowRight, Phone, Mail, HelpCircle, XCircle, AlertTriangle, Star,
  AlertCircle, UserCircle, Zap, TrendingUp, PieChart, Clock, Sparkles,
  ChevronDown, Receipt, Ban, CircleDollarSign, FileBarChart, ShieldAlert,
  Smartphone, Globe, HeartHandshake, BadgeCheck, Minus, Plus
} from "lucide-react";

/* ── Animation helpers ── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardReveal = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const float = {
  animate: { y: [0, -10, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const } },
};

const floatSlow = {
  animate: { y: [0, -8, 0], transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const, delay: 1 } },
};

/* ── Scroll-triggered section wrapper ── */
const RevealSection = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ── FAQ Accordion Item ── */
const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm bg-white/[0.03] hover:border-white/20 transition-colors">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 sm:p-6 text-left gap-4">
        <span className="font-bold text-sm sm:text-base text-white/90">{q}</span>
        <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center shrink-0 transition-all duration-300 ${open ? "bg-emerald-500/20 border-emerald-500/30 rotate-180" : ""}`}>
          <ChevronDown size={16} className={`text-white/60 transition-transform duration-300 ${open ? "text-emerald-400" : ""}`} />
        </div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <p className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-slate-400 font-medium leading-relaxed">{a}</p>
      </motion.div>
    </div>
  );
};

/* ── Marquee ── */
const Marquee = () => {
  const items = [
    "Club Deportivo El Sol", "Complejo La Cancha", "Padel Zone BA", "Arena Sport Center",
    "El Gol de Oro", "Canchas del Sur", "Sport City Mendoza", "Palermo Padel Club",
  ];
  return (
    <div className="relative overflow-hidden py-6">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0f1219] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0f1219] to-transparent z-10" />
      <div className="flex animate-[marquee_30s_linear_infinite] whitespace-nowrap gap-12">
        {[...items, ...items].map((name, i) => (
          <span key={i} className="text-sm font-bold text-white/20 tracking-wider uppercase flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500/30" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ── Mini stat cards for hero ── */
const MiniStat = ({ icon: Icon, label, value, color, className = "" }: { icon: any; label: string; value: string; color: string; className?: string }) => (
  <motion.div
    variants={float}
    animate="animate"
    className={`hidden xl:flex absolute bg-[#161b26]/90 border border-white/10 shadow-2xl shadow-black/30 p-4 rounded-2xl items-center gap-3 z-20 backdrop-blur-xl ${className}`}
  >
    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
      <Icon size={18} />
    </div>
    <div className="text-left">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-black text-white">{value}</p>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════ */
const Landing = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<"idle" | "sent">("idle");
  const constraintsRef = useRef(null);

  const { scrollYProgress } = useScroll();
  const rotateX = useTransform(scrollYProgress, [0, 0.12], [3, -4]);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus("sent");
    setTimeout(() => setFormStatus("idle"), 4000);
  };

  return (
    <div className="min-h-screen bg-[#0f1219] text-slate-50 font-sans selection:bg-emerald-500/30 relative overflow-hidden">

      {/* ═══ NAVBAR ═══ */}
      <header className="fixed top-0 w-full z-50 bg-[#0f1219]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 sm:h-[72px] px-5 sm:px-8">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src="/favicon.png" alt="Logo MySportdate" className="w-9 h-9 rounded-xl shadow-lg shadow-emerald-500/20 object-contain" />
            <span className="font-extrabold text-lg tracking-tight text-white">MySpordate</span>
          </div>

          <nav className="hidden xl:flex items-center gap-8 text-[13px] font-semibold text-slate-400">
            {[["Beneficios", "beneficios"], ["Funciones", "caracteristicas"], ["Precios", "precios"], ["FAQ", "faq"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="hover:text-white transition-colors duration-200 relative group py-1">
                {label}
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-500 group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <button onClick={() => navigate("/auth/login")} className="text-[13px] font-bold text-slate-300 hover:text-white transition-colors px-4 py-2">
              Ingresar
            </button>
            <button onClick={() => navigate("/auth/login")} className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-[13px] hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-px">
              Probar Gratis
            </button>
          </div>

          <button className="xl:hidden p-2 text-white" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="xl:hidden bg-[#0f1219]/95 backdrop-blur-2xl border-b border-white/5 absolute w-full shadow-2xl">
            <div className="flex flex-col p-4 space-y-1">
              {[["Beneficios", "beneficios"], ["Funciones", "caracteristicas"], ["Precios", "precios"], ["FAQ", "faq"]].map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)} className="p-3 text-left font-bold rounded-xl hover:bg-white/5 text-sm text-slate-300">{label}</button>
              ))}
              <hr className="my-2 border-white/5" />
              <button onClick={() => navigate("/auth/login")} className="p-3 text-left font-bold rounded-xl hover:bg-white/5 text-emerald-400 text-sm">Ingresar al panel</button>
            </div>
          </motion.div>
        )}
      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-28 pb-10 xl:pt-36 xl:pb-20 overflow-hidden min-h-[95vh] flex items-center">
        {/* BG Glows */}
        <div className="absolute top-0 left-1/3 w-[900px] h-[900px] bg-emerald-500/[0.07] rounded-full blur-[180px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/[0.05] rounded-full blur-[150px] -z-10" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="max-w-7xl mx-auto relative z-10 px-5 sm:px-8 w-full">
          <div className="grid xl:grid-cols-12 gap-10 xl:gap-16 items-center">
            {/* Text */}
            <div className="xl:col-span-5 text-center xl:text-left">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" /> Plataforma #1 para predios
                </div>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible" className="text-4xl sm:text-5xl md:text-[3.5rem] xl:text-[3.8rem] font-black tracking-[-0.03em] mb-6 leading-[1.08]">
                Gestioná tu predio deportivo,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400">
                  como un profesional.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible" className="text-base sm:text-lg text-slate-400 max-w-lg mx-auto xl:mx-0 mb-8 font-medium leading-relaxed">
                Reservas online, cobro de señas automático con Mercado Pago, control de kiosco, gastos y analíticas. Todo desde tu celular.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible" className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-3">
                <button onClick={() => navigate("/auth/login")}
                  className="w-full sm:w-auto bg-emerald-500 text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-px flex items-center justify-center gap-2">
                  Probar Gratis <ArrowRight size={16} />
                </button>
                <button onClick={() => scrollTo("caracteristicas")}
                  className="w-full sm:w-auto border border-white/10 text-slate-300 px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-white/5 hover:border-white/20 transition-all flex items-center justify-center gap-2">
                  Ver cómo funciona
                </button>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible" className="flex items-center justify-center xl:justify-start gap-6 mt-8 text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Sin tarjeta</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> 14 días gratis</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Sin comisiones</span>
              </motion.div>
            </div>

            {/* Mockup */}
            <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible" className="xl:col-span-7 relative" ref={constraintsRef}>
              <div className="absolute -inset-16 bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent rounded-full blur-[120px] -z-10" />

              {/* Floating stats */}
              <MiniStat icon={Wallet} label="Ingreso del día" value="$45.700" color="bg-emerald-500/20 text-emerald-400" className="-left-10 top-1/4" />
              <MiniStat icon={Coffee} label="Venta Kiosco" value="Gatorade + Turrón" color="bg-orange-500/20 text-orange-400" className="-right-6 bottom-20" />
              <motion.div variants={floatSlow} animate="animate" className="hidden xl:flex absolute -right-4 top-8 bg-[#161b26]/90 border border-white/10 shadow-2xl p-3 rounded-xl items-center gap-2 z-20 backdrop-blur-xl">
                <div className="w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center justify-center"><TrendingUp size={14} /></div>
                <div className="text-left"><p className="text-[10px] font-semibold text-slate-500">Ocupación</p><p className="text-xs font-black text-white">87%</p></div>
              </motion.div>

              {/* Browser frame */}
              <motion.div style={{ rotateX }} className="rounded-2xl xl:rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-1.5 xl:p-2 shadow-2xl shadow-black/40">
                <div className="relative bg-[#0a0d14] rounded-xl xl:rounded-2xl border border-white/[0.04] overflow-hidden aspect-[16/10]">
                  <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04] bg-[#12151e]">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                    <span className="ml-3 text-[10px] text-slate-600 font-medium">admin.myspordate.com</span>
                  </div>
                  <img src="/MySportdateImg.JPG" alt="MySpordate Dashboard" className="w-full h-full object-cover opacity-75" />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF MARQUEE ═══ */}
      <div className="border-y border-white/[0.04] bg-[#0f1219]">
        <div className="max-w-7xl mx-auto px-5">
          <p className="text-center text-[11px] font-bold text-slate-600 uppercase tracking-[0.2em] pt-6 mb-2">Confiado por predios en toda Argentina y Latinoamérica</p>
          <Marquee />
        </div>
      </div>

      {/* ═══ BENEFICIOS: Caos vs Paz ═══ */}
      <section id="beneficios" className="py-24 xl:py-32 bg-[#0f1219] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent -z-10" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <RevealSection className="text-center mb-20">
            <span className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-4 block">¿Por qué cambiar?</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-black tracking-[-0.03em] mb-4">Evolucioná tu forma de trabajar</h2>
            <p className="text-slate-500 text-base sm:text-lg font-medium max-w-2xl mx-auto">Administrar un complejo no debería sentirse como una carga constante.</p>
          </RevealSection>

          <div className="relative max-w-6xl mx-auto">
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent hidden xl:block" />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-0 xl:gap-x-16">
              {/* Caos */}
              <RevealSection className="space-y-5 xl:pr-10">
                <div className="text-center xl:text-right mb-10">
                  <h3 className="text-xl sm:text-2xl font-black text-red-400 flex items-center gap-2 justify-center xl:justify-end mb-2"><XCircle className="w-6 h-6" /> El caos del cuaderno</h3>
                  <p className="text-slate-600 font-semibold text-sm">Problemas que frenan tu crecimiento</p>
                </div>
                {[
                  { icon: BookX, title: "Turnos Duplicados", desc: "El error humano te hace quedar mal con los clientes." },
                  { icon: Wallet, title: "Pérdida de Señas", desc: "No te pagan, no podés volver a alquilar el turno." },
                  { icon: MessageCircle, title: "WhatsApp 24/7", desc: "Te la pasás respondiendo mensajes a cualquier hora." },
                  { icon: UserCircle, title: "Sin Datos de Clientes", desc: "No tenés historial ni conocés a los más faltadores." },
                ].map((item, i) => (
                  <motion.div key={i} variants={cardReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 flex items-start gap-4 group hover:border-red-500/20 transition-all backdrop-blur-sm relative">
                    <div className="absolute top-1/2 -translate-y-1/2 -right-10 w-3 h-3 rounded-full bg-slate-800 border border-white/10 group-hover:bg-red-500 group-hover:border-red-400 transition-colors hidden xl:block z-10" />
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0"><item.icon size={18} className="text-red-400" /></div>
                    <div>
                      <h4 className="font-bold text-sm text-red-400 mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </RevealSection>

              {/* Paz */}
              <RevealSection className="space-y-5 xl:pl-10 xl:pt-16">
                <div className="text-center xl:text-left mb-10">
                  <h3 className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-2 justify-center xl:justify-start mb-2"><CheckCircle2 className="w-6 h-6" /> La paz de MySpordate</h3>
                  <p className="text-slate-600 font-semibold text-sm">Soluciones que te dan libertad</p>
                </div>
                {[
                  { icon: CalendarCheck, title: "Agenda Inteligente", desc: "Centralizada en la nube. Turnos dobles imposibles." },
                  { icon: CircleDollarSign, title: "Cobro automático de Señas", desc: "Integración nativa con Mercado Pago." },
                  { icon: LinkIcon, title: "Reservas Online", desc: "Página web propia para que el cliente se autogestione." },
                  { icon: Coffee, title: "Buffet Integrado", desc: "Punto de venta POS rápido con control de stock." },
                ].map((item, i) => (
                  <motion.div key={i} variants={cardReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}
                    className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-2xl p-5 flex items-start gap-4 group hover:border-emerald-500/25 hover:-translate-y-0.5 transition-all backdrop-blur-sm relative">
                    <div className="absolute top-1/2 -translate-y-1/2 -left-10 w-3 h-3 rounded-full bg-slate-800 border border-white/10 group-hover:bg-emerald-500 group-hover:border-emerald-400 transition-colors hidden xl:block z-10" />
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><item.icon size={18} className="text-emerald-400" /></div>
                    <div>
                      <h4 className="font-bold text-sm text-white mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </RevealSection>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BENTO GRID ═══ */}
      <section id="caracteristicas" className="py-24 xl:py-32 bg-[#0f1219] relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-500/[0.03] rounded-full blur-[200px] -z-10" />

        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <RevealSection className="text-center mb-16">
            <span className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] bg-emerald-500/10 px-4 py-1.5 rounded-full inline-block mb-5">Todo Incluido</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-black tracking-[-0.03em]">
              El control total,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">sin comisiones.</span>
            </h2>
          </RevealSection>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5">

            {/* Agenda – Large */}
            <motion.div variants={cardReveal} className="xl:col-span-8 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-[1.5rem] p-7 sm:p-9 group hover:border-emerald-500/20 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.05] rounded-full blur-[80px] -z-10 group-hover:bg-emerald-500/[0.08] transition-colors" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><CalendarCheck className="text-emerald-400" size={22} /></div>
                <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-[0.2em]">Core</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black mb-3 text-white">Agenda Inteligente</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-md">
                Turnos fijos, manuales y online sin superposiciones. Visualizá todo en una grilla diaria como un calendario profesional.
              </p>
              {/* Mini grid preview */}
              <div className="mt-6 grid grid-cols-5 gap-1.5 max-w-xs opacity-40 group-hover:opacity-60 transition-opacity">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className={`h-6 rounded-md ${[2, 5, 8, 11].includes(i) ? "bg-emerald-500/40" : [4, 9].includes(i) ? "bg-cyan-500/30" : "bg-white/[0.06]"}`} />
                ))}
              </div>
            </motion.div>

            {/* Pagos */}
            <motion.div variants={cardReveal} className="xl:col-span-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-[1.5rem] p-7 sm:p-8 group hover:border-emerald-500/20 transition-all relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-500/[0.06] rounded-full blur-[60px] -z-10" />
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5"><Wallet className="text-cyan-400" size={22} /></div>
              <h3 className="text-lg font-black mb-2 text-white">Pagos Integrados</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                Cobro de señas automático con Mercado Pago. Olvidate de perseguir transferencias.
              </p>
              <div className="mt-5 flex items-center gap-2">
                <div className="h-8 px-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-1.5 text-[10px] font-bold text-cyan-400">
                  <CircleDollarSign size={12} /> MercadoPago
                </div>
              </div>
            </motion.div>

            {/* CRM */}
            <motion.div variants={cardReveal} className="xl:col-span-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-[1.5rem] p-7 sm:p-8 group hover:border-emerald-500/20 transition-all">
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5"><Users className="text-violet-400" size={22} /></div>
              <h3 className="text-lg font-black mb-2 text-white">CRM de Jugadores</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                Historial de asistencia y penalización automática por "No Shows". Conocé a tus clientes.
              </p>
            </motion.div>

            {/* Buffet */}
            <motion.div variants={cardReveal} className="xl:col-span-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-[1.5rem] p-7 sm:p-8 group hover:border-orange-500/20 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/[0.06] rounded-full blur-[60px] -z-10" />
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-5"><Coffee className="text-orange-400" size={22} /></div>
              <h3 className="text-lg font-black mb-2 text-white">Buffet y Kiosco</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                Punto de venta (POS) integrado para vender bebidas y descontar stock automáticamente.
              </p>
            </motion.div>

            {/* Analíticas */}
            <motion.div variants={cardReveal} className="xl:col-span-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-[1.5rem] p-7 sm:p-8 group hover:border-emerald-500/20 transition-all relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-emerald-500/[0.05] rounded-full blur-[80px] -z-10" />
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5"><BarChart3 className="text-emerald-400" size={22} /></div>
              <h3 className="text-lg font-black mb-2 text-white">Analíticas Financieras</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                Mapas de calor de horarios pico y reportes de ganancia neta. Decisiones con datos reales.
              </p>
              {/* Mini chart */}
              <div className="mt-5 flex items-end gap-1 h-10 opacity-40 group-hover:opacity-60 transition-opacity">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="flex-1 bg-emerald-500/40 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </motion.div>

            {/* Gastos – wide */}
            <motion.div variants={cardReveal} className="xl:col-span-8 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-[1.5rem] p-7 sm:p-9 group hover:border-emerald-500/20 transition-all relative overflow-hidden">
              <div className="absolute top-0 left-0 w-48 h-48 bg-rose-500/[0.04] rounded-full blur-[80px] -z-10" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center"><Receipt className="text-rose-400" size={22} /></div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black mb-3 text-white">Control de Gastos</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-md">
                Registro de egresos de luz, sueldos y mantenimiento. Mirá tu ganancia neta real, no la ilusión de facturación bruta.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Luz", "Agua", "Sueldos", "Proveedores", "Mantenimiento"].map((cat) => (
                  <span key={cat} className="text-[10px] font-bold text-slate-500 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-lg">{cat}</span>
                ))}
              </div>
            </motion.div>

            {/* Soporte */}
            <motion.div variants={cardReveal} className="md:col-span-2 xl:col-span-4 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02] border border-emerald-500/15 rounded-[1.5rem] p-7 sm:p-8 group hover:border-emerald-500/30 transition-all">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5"><HeartHandshake className="text-emerald-400" size={22} /></div>
              <h3 className="text-lg font-black mb-2 text-white">Soporte Ilimitado</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                Atención exclusiva por WhatsApp de lun a lun. Te ayudamos a configurar todo en minutos.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ CÓMO FUNCIONA ═══ */}
      <section id="como-funciona" className="py-24 xl:py-32 bg-[#0f1219] relative">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <RevealSection className="text-center mb-16">
            <span className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-4 block">Empezá en minutos</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[-0.03em]">3 pasos y estás listo</h2>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { step: "01", icon: Settings, title: "Configurá tu predio", desc: "Nombre, canchas, deportes, horarios y precios. En 10 minutos tenés todo listo." },
              { step: "02", icon: Share2, title: "Compartí tu link", desc: "Cada predio tiene su página única. Difundila por WhatsApp, Insta o donde quieras." },
              { step: "03", icon: TrendingUp, title: "Crecé con datos", desc: "Tus clientes reservan solos, vos cobrás la seña automática y analizás resultados." },
            ].map((item, i) => (
              <RevealSection key={i}>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 sm:p-8 text-center group hover:border-emerald-500/20 transition-all relative">
                  <span className="text-[64px] font-black text-white/[0.04] absolute top-4 right-6 leading-none select-none">{item.step}</span>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                    <item.icon size={24} className="text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-black mb-2 text-white">{item.title}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRECIOS ═══ */}
      <section id="precios" className="py-24 xl:py-32 bg-[#0f1219] relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.05] rounded-full blur-[200px] -z-10" />

        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[-0.03em] mb-4">Invertí en tu tranquilidad</h2>
            <p className="text-slate-500 text-base sm:text-lg font-medium max-w-xl mx-auto">Un solo turno que salves de quedar vacío ya paga la suscripción mensual.</p>
          </RevealSection>

          <RevealSection>
            <div className="relative bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-[2rem] p-8 sm:p-12 xl:p-14 shadow-2xl shadow-emerald-500/[0.05]">
              {/* Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-black px-5 py-1.5 rounded-full uppercase tracking-[0.15em] text-[10px] shadow-lg shadow-emerald-500/30">
                Plan Completo Ilimitado
              </div>

              <div className="grid md:grid-cols-2 gap-10 items-center">
                <div className="text-center md:text-left border-b md:border-b-0 md:border-r border-white/[0.06] pb-8 md:pb-0 md:pr-10">
                  <p className="text-5xl sm:text-6xl font-black mb-2 text-white">$15.000<span className="text-xl text-slate-600 font-semibold">/mes</span></p>
                  <p className="text-sm font-bold text-slate-500 mb-4">Costo fijo. Sin comisiones ocultas.</p>
                  <p className="text-xs text-slate-600 font-medium">Cancelá cuando quieras, sin contratos.</p>
                </div>

                <div className="space-y-4 md:pl-4">
                  {[
                    "Reservas Ilimitadas",
                    "Integración Mercado Pago",
                    "Módulo Buffet POS",
                    "Analíticas Gerenciales",
                    "Control de Gastos",
                    "CRM de Jugadores",
                    "Soporte WhatsApp",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="text-emerald-400 w-4.5 h-4.5 shrink-0" size={18} />
                      <span className="font-semibold text-slate-300 text-sm">{feature}</span>
                    </div>
                  ))}
                  <button onClick={() => navigate("/auth/login")} className="w-full mt-6 bg-emerald-500 text-white py-4 rounded-xl font-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 text-sm">
                    Comenzar 14 días Gratis
                  </button>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="py-24 xl:py-32 bg-[#0f1219] relative">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <RevealSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black tracking-[-0.03em] mb-4">Preguntas Frecuentes</h2>
            <p className="text-slate-500 font-medium text-sm">Todo lo que necesitás saber antes de empezar.</p>
          </RevealSection>

          <RevealSection className="space-y-3">
            <FaqItem q="¿Tengo que instalar algo en mi PC?" a="¡Para nada! MySpordate funciona 100% en la nube. Entrás desde cualquier navegador en tu PC o celular. No necesitás descargar nada." />
            <FaqItem q="¿Qué pasa si ya tengo reservas anotadas?" a="Podés pasarlas fácilmente usando el módulo de carga manual o los Turnos Fijos. No perdés nada de tu historial." />
            <FaqItem q="¿Cobran comisión por reserva?" a="No. Solo pagás el costo fijo mensual de $15.000. Las señas que cobres van directo a tu cuenta de Mercado Pago, sin intermediarios." />
            <FaqItem q="¿Puedo gestionar más de un deporte?" a="¡Sí! Podés configurar fútbol, pádel, tenis, básquet o lo que necesites. Cada cancha se asocia al deporte correspondiente." />
            <FaqItem q="¿Qué soporte ofrecen?" a="Tenés soporte ilimitado por WhatsApp de lunes a lunes. Te ayudamos a configurar todo y resolver cualquier duda en minutos." />
          </RevealSection>
        </div>
      </section>

      {/* ═══ CONTACTO / CTA FINAL ═══ */}
      <section id="contacto" className="py-24 xl:py-32 bg-[#0f1219] relative">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/[0.03] to-transparent -z-10" />

        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <RevealSection>
            <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-[2rem] p-8 sm:p-12 xl:p-16 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/[0.08] rounded-full blur-[100px] -z-10" />

              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-[-0.03em] mb-4">¿Querés ver el sistema por dentro?</h2>
                  <p className="text-slate-500 font-medium leading-relaxed text-sm max-w-sm mb-6">
                    Dejanos tus datos y un especialista te va a agendar una Demo de 15 minutos por WhatsApp.
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <BadgeCheck size={16} className="text-emerald-500" />
                    <span className="font-semibold">Sin compromiso. Sin tarjeta de crédito.</span>
                  </div>
                </div>

                <div>
                  {formStatus === "sent" ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-8 rounded-2xl text-center">
                      <CheckCircle2 className="w-14 h-14 mx-auto mb-4" />
                      <h3 className="text-lg font-black mb-2">¡Datos enviados!</h3>
                      <p className="font-medium text-sm text-emerald-400/70">Nos contactaremos con vos a la brevedad.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-3.5 bg-white/[0.03] border border-white/[0.06] p-6 sm:p-7 rounded-2xl backdrop-blur-sm">
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input type="text" required placeholder="Nombre del complejo" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 font-semibold text-sm outline-none focus:border-emerald-500/40 transition-colors text-white placeholder:text-slate-600" />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input type="tel" required placeholder="WhatsApp (con código de área)" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 font-semibold text-sm outline-none focus:border-emerald-500/40 transition-colors text-white placeholder:text-slate-600" />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input type="email" required placeholder="Tu email" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 font-semibold text-sm outline-none focus:border-emerald-500/40 transition-colors text-white placeholder:text-slate-600" />
                      </div>
                      <button type="submit" className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-black text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 mt-1">
                        Solicitar Demo Gratuita
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.04] py-10 bg-[#0a0d14]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src="/favicon.png" alt="Logo MySportdate" className="w-9 h-9 rounded-xl shadow-lg shadow-emerald-500/20 object-contain" />
            <span className="font-extrabold text-base text-white">MySpordate</span>
          </div>
          <div className="flex gap-6 text-xs font-semibold text-slate-600">
            <span>© {new Date().getFullYear()} MySpordate</span>
            <a href="mailto:contacto@myspordate.com" className="hover:text-emerald-400 transition-colors">contacto@myspordate.com</a>
          </div>
        </div>
      </footer>

      {/* ═══ FLOATING WHATSAPP ═══ */}
      <a href="https://wa.me/5491100000000" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/30 hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/40 transition-all"
        aria-label="Contactar por WhatsApp">
        <MessageCircle className="text-white fill-white" size={26} />
      </a>

      {/* Marquee keyframe */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default Landing;
