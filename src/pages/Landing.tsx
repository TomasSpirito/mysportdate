import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useRef } from "react";
import {
  BookX, ShieldCheck, LinkIcon, BarChart3, Wallet, Trophy, Users, Menu, X, 
  CalendarCheck, Settings, Share2, MessageCircle, ChevronRight, CheckCircle2, 
  Coffee, ArrowRight, Phone, Mail, HelpCircle, XCircle, AlertTriangle, Star, AlertCircle, UserCircle
} from "lucide-react";

// Variantes de animación
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.7, ease: "easeOut" as const } }),
};

const float = {
  animate: { y: [0, -12, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } }
};

const Landing = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<"idle" | "sent">("idle");
  const constraintsRef = useRef(null);

  const { scrollYProgress } = useScroll();
  const rotateX = useTransform(scrollYProgress, [0, 0.15], [2, -5]);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus("sent");
    setTimeout(() => setFormStatus("idle"), 3000);
  };

  return (
    // CAMBIO: Contenedor general en modo oscuro (#1a1f2e aprox, slate muy oscuro)
    <div className="min-h-screen bg-[#1e2330] text-slate-50 font-sans selection:bg-primary/30 relative overflow-hidden">
        
      {/* ─── Navbar (CORREGIDO: Fondo sólido para color fuerte) ─── */}
      <header className="fixed top-0 w-full z-50 bg-[#1e2330] backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="container-w flex items-center justify-between h-16 sm:h-20 px-6 sm:px-10">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-primary/20">
              S
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">MySpordate</span>
          </div>

          <nav className="hidden xl:flex items-center gap-10 text-sm font-semibold text-slate-300 hover:[&>button]:text-primary [&>button]:transition-colors">
            <button onClick={() => scrollTo("beneficios")}>Beneficios</button>
            <button onClick={() => scrollTo("caracteristicas")}>Características</button>
            <button onClick={() => scrollTo("precios")}>Precios</button>
            <button onClick={() => scrollTo("faq")}>Soporte</button>
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <button onClick={() => navigate("/auth/login")} className="text-sm font-bold text-white hover:text-primary transition-colors">
              Ingresar
            </button>
            <button onClick={() => navigate("/auth/login")} className="bg-[#10b981] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all">
              Probar Gratis
            </button>
          </div>

          <button className="xl:hidden p-2 text-white" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu (Oscuro) */}
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="xl:hidden bg-[#1e2330] border-b border-white/10 absolute w-full shadow-2xl">
            <div className="flex flex-col p-4 space-y-2 text-white">
              <button onClick={() => scrollTo("beneficios")} className="p-3 text-left font-bold rounded-lg hover:bg-white/5">Beneficios</button>
              <button onClick={() => scrollTo("caracteristicas")} className="p-3 text-left font-bold rounded-lg hover:bg-white/5">Características</button>
              <button onClick={() => scrollTo("precios")} className="p-3 text-left font-bold rounded-lg hover:bg-white/5">Precios</button>
              <button onClick={() => scrollTo("faq")} className="p-3 text-left font-bold rounded-lg hover:bg-white/5">Soporte</button>
              <hr className="my-2 border-white/10" />
              <button onClick={() => navigate("/auth/login")} className="p-3 text-left font-bold rounded-lg hover:bg-white/5 text-primary">Ingresar al panel</button>
            </div>
          </motion.div>
        )}
      </header>

      {/* ─── Hero Section (Modo Oscuro, Menos Padding Vertical) ─── */}
      <section className="relative pt-24 pb-16 xl:pt-32 xl:pb-24 overflow-hidden min-h-[90vh] flex items-center z-10">
        {/* Glows de fondo oscuros */}
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] -z-10" />
        
        <div className="container-w relative z-10 px-6 sm:px-10 w-full">
          <div className="grid xl:grid-cols-12 gap-12 xl:gap-20 items-center">
            
            <div className="xl:col-span-5 text-center xl:text-left mt-8 xl:mt-0">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <div className="inline-flex items-center gap-2.5 bg-primary/10 border border-primary/20 text-[#10b981] text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest backdrop-blur-sm">
                  <Star className="w-3.5 h-3.5 fill-[#10b981]" /> Plataforma #1 para predios
                </div>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible" className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black tracking-tighter mb-5 leading-[1.1] max-w-5xl mx-auto text-white">
                Gestioná tu predio deportivo, <br className="hidden sm:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-[#0ea5e9]">
                   como un profesional.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible" className="text-lg sm:text-xl xl:text-2xl text-slate-300 xl:max-w-md xl:mx-0 max-w-2xl mx-auto mb-8 font-medium leading-relaxed">
                Reservas online, cobro de señas automáticas, control de kiosco, gastos y analíticas desde tu celular.
              </motion.p>

              {/* Botones estilo Original */}
              <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible" className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-4">
                <button onClick={() => navigate("/auth/login")}
                  className="w-full sm:w-auto bg-[#10b981] text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  Crear cuenta gratis <ChevronRight size={16} />
                </button>
                <button onClick={() => scrollTo("como-funciona")}
                  className="w-full sm:w-auto border border-white/20 text-slate-200 px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                  Ver cómo funciona
                </button>
              </motion.div>
            </div>

            {/* MOCKUP CON WIDGETS Y RESPLANDOR */}
            <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible" className="xl:col-span-7 relative max-w-full xl:max-w-none perspective-1000 mt-10 xl:mt-0" ref={constraintsRef}>
                
                {/* Resplandor Verde Detrás de la imagen */}
                <div className="absolute -inset-10 bg-gradient-to-b from-[#10b981]/20 via-[#10b981]/5 to-transparent rounded-3xl blur-[100px] -z-10 opacity-70" />

                {/* Widgets flotantes (Solo en PC) */}
                <motion.div variants={float} animate="animate" className="hidden xl:flex absolute -left-12 top-1/4 bg-[#1e2330] border border-white/10 shadow-2xl p-4 rounded-2xl items-center gap-3 z-20 backdrop-blur-xl">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-500"><Wallet size={20}/></div>
                    <div className="text-left"><p className="text-xs font-bold text-slate-400">Ingreso del día</p><p className="text-sm font-black text-white">$45.700</p></div>
                </motion.div>

                <motion.div variants={float} animate="animate" style={{ animationDelay: "1s" }} className="hidden xl:flex absolute -right-8 bottom-16 bg-[#1e2330] border border-white/10 shadow-2xl p-4 rounded-2xl items-center gap-3 z-20 backdrop-blur-xl">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-500"><Coffee size={20}/></div>
                    <div className="text-left"><p className="text-xs font-bold text-slate-400">Venta Kiosco</p><p className="text-sm font-black text-white">Gatorade + Turrón</p></div>
                </motion.div>

                {/* Contenedor de la Imagen */}
                <motion.div style={{ rotateX }} className="rounded-2xl xl:rounded-[2rem] border border-white/10 bg-[#1e2330]/40 backdrop-blur-md p-2 xl:p-3 shadow-2xl transition-transform duration-100 ease-out origin-top">
                    <div className="relative bg-[#0f111a] rounded-xl xl:rounded-2xl border border-white/5 shadow-2xl overflow-hidden aspect-[16/10]">
                        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5 bg-[#171a23]">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                            <span className="ml-3 text-[10px] text-slate-500 font-medium truncate">admin.myspordate.com</span>
                        </div>
                        
                        <img 
                            src="public/MySportdateImg.jpg" 
                            alt="MySpordate Dashboard" 
                            className="w-full h-full object-cover opacity-80" 
                        />                        
                    </div>
                </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── TRANSICIÓN GRADUAL (CORREGIDO: Degradado Largo) ─── */}
      <div className="bg-gradient-to-b from-[#1e2330] to-[#f8fafc] h-72 w-full z-0" />

      {/* ─── Problema vs Solución (CORREGIDO: Listado 4x4 Balanced) ─── */}
      <section id="beneficios" className="py-20 xl:py-24 bg-[#f8fafc] text-slate-900 relative">
        <div className="container-w px-6 xl:px-10">
            <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl xl:text-6xl font-black mb-4 tracking-tighter">Evolucioná tu forma de trabajar</h2>
                <p className="text-slate-500 text-lg xl:text-xl font-medium max-w-2xl mx-auto">Administrar un complejo no debería sentirse como una carga constante.</p>
            </div>

            <div className="relative max-w-6xl mx-auto group">
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-slate-200 hidden xl:block" />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 xl:gap-0 xl:gap-x-16 relative">
                    {/* El Caos (CORREGIDO: 4 items) */}
                    <div className="space-y-8 xl:pr-10">
                        <div className="text-center xl:text-right mb-12">
                            <h3 className="text-2xl font-black text-red-500 flex items-center gap-2 justify-center xl:justify-end mb-2"><XCircle className="w-7 h-7"/> El caos del cuaderno</h3>
                            <p className="text-slate-400 font-semibold text-sm">Problemas que frenan tu crecimiento</p>
                        </div>

                        {[
                            { icon: BookX, title: "Turnos Duplicados", desc: "El error humano te hace quedar mal con los clientes." },
                            { icon: Wallet, title: "Pérdida de Señas", desc: "No te pagan, no podés volver a alquilar el turno." },
                            { icon: MessageCircle, title: "WhatsApp 24/7", desc: "Te la pasás respondiendo a cualquier hora." },
                            { icon: UserCircle, title: "Falta de Datos de Clientes", desc: "No tenés historial, datos de contacto ni conocés a los más faltadores." }, // <--- Nuevo ítem
                        ].map((item, i) => (
                            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-start gap-4 relative group hover:border-red-200 transition-all shadow-sm">
                                <div className="absolute top-1/2 -translate-y-1/2 -right-10 w-4 h-4 rounded-full bg-slate-200 border-2 border-[#f8fafc] group-hover:bg-red-500 group-hover:border-white transition-colors hidden xl:block z-10"/>
                                <item.icon size={22} className="text-red-500 shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-red-500 mb-1 leading-tight">{item.title}</h4>
                                    <p className="text-sm text-slate-500 font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* La Paz (4 items) */}
                    <div className="space-y-8 xl:pl-10 xl:pt-16">
                        <div className="text-center xl:text-left mb-12">
                            <h3 className="text-2xl font-black text-[#10b981] flex items-center gap-2 justify-center xl:justify-start mb-2"><CheckCircle2 className="w-7 h-7"/> La paz de MySpordate</h3>
                            <p className="text-slate-400 font-semibold text-sm">Soluciones que te dan libertad</p>
                        </div>

                        {[
                            { icon: CalendarCheck, title: "Agenda Inteligente", desc: "Centralizada en la nube. Turnos dobles imposibles." },
                            { icon: Wallet, title: "Cobro automático de Señas", desc: "Integración nativa con Mercado Pago." },
                            { icon: LinkIcon, title: "Reservas Online", desc: "Página web propia para que el cliente se autogestione." },
                            { icon: Coffee, title: "Buffet y Kiosco Integrado", desc: "Punto de venta POS rápido con control de stock." },
                        ].map((item, i) => (
                            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-start gap-4 relative group hover:border-[#10b981]/40 hover:-translate-y-1 transition-all shadow-md shadow-[#10b981]/5">
                                <div className="absolute top-1/2 -translate-y-1/2 -left-10 w-4 h-4 rounded-full bg-slate-200 border-2 border-[#f8fafc] group-hover:bg-[#10b981] group-hover:border-white transition-colors hidden xl:block z-10"/>
                                <item.icon size={22} className="text-[#10b981] shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1 leading-tight">{item.title}</h4>
                                    <p className="text-sm text-slate-600 font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* ─── Características (Bento Grid) ─── */}
      <section id="caracteristicas" className="py-24 bg-white text-slate-900">
        <div className="container-w px-6 xl:px-10 max-w-7xl">
          <div className="text-center mb-20">
            <span className="text-[#10b981] text-xs font-black uppercase tracking-widest bg-[#10b981]/10 px-3 py-1.5 rounded-full">Todo Incluido</span>
            <h2 className="text-4xl md:text-5xl xl:text-6xl font-black mt-5 tracking-tighter">
              El control total, sin comisiones.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 hover:[&>div]:border-[#10b981]/30 [&>div]:transition-colors [&>div]:duration-300">
            {/* Analíticas */}
            <div className="xl:col-span-8 bg-[#f8fafc] border border-slate-200 rounded-[2rem] p-8 flex flex-col justify-between group overflow-hidden relative">
              <div className="relative z-10 max-w-md">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-5 border border-slate-200 shadow-sm">
                    <BarChart3 className="text-[#10b981]" size={24} />
                </div>
                <h3 className="text-2xl font-black mb-3">Gráficos Financieros y Ocupación</h3>
                <p className="text-slate-500 font-medium text-base leading-relaxed">
                  Mapas de calor de horarios pico, cálculo de ticket promedio y tasa de cancelación. Tomá decisiones con datos reales.
                </p>
              </div>
            </div>

            {/* Buffet */}
            <div className="xl:col-span-4 bg-[#f8fafc] border border-slate-200 rounded-[2rem] p-8">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-5 border border-slate-200 shadow-sm">
                <Coffee className="text-orange-500" size={24} />
              </div>
              <h3 className="text-xl font-black mb-2">Buffet Integrado</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                Punto de venta POS para kiosco. Controlá stock de heladeras y ventas ligadas a la caja del día.
              </p>
            </div>

            {/* Caja */}
            <div className="xl:col-span-4 bg-[#f8fafc] border border-slate-200 rounded-[2rem] p-8">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-5 border border-slate-200 shadow-sm">
                <Wallet className="text-[#10b981]" size={24} />
              </div>
              <h3 className="text-xl font-black mb-2">Caja y Egresos</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                Registrá cobros (Efectivo, Mercado Pago). Cargá gastos fijos y mirá tu ganancia neta.
              </p>
            </div>

            {/* Soporte */}
            <div className="xl:col-span-8 bg-[#f8fafc] border border-slate-200 rounded-[2rem] p-8 flex flex-col justify-between group overflow-hidden relative">
                <div className="relative z-10 max-w-md">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-5 border border-slate-200 shadow-sm">
                        <MessageCircle className="text-[#10b981]" size={24} />
                    </div>
                    <h3 className="text-2xl font-black mb-3">Acompañamiento Ilimitado</h3>
                    <p className="text-slate-500 font-medium text-base leading-relaxed">
                      Atención exclusiva por WhatsApp de lun a lun. Te ayudamos a configurar el predio y resolver dudas en minutos.
                    </p>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Precios ─── */}
      <section id="precios" className="py-24 bg-[#f8fafc] text-slate-900">
        <div className="container-w px-6 xl:px-10 max-w-5xl">
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-4">Invertí en tu tranquilidad</h2>
                <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">Un solo turno que salves de quedar vacío gracias a la plataforma, ya paga la suscripción mensual.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border-2 border-[#10b981] p-10 xl:p-14 shadow-2xl shadow-[#10b981]/10 relative grid md:grid-cols-2 gap-10 items-center">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#10b981] text-white font-black px-5 py-1.5 rounded-full uppercase tracking-widest text-[10px]">
                    Plan Completo Ilimitado
                </div>
                
                <div className="text-center md:text-left border-b md:border-b-0 md:border-r border-slate-100 pb-8 md:pb-0 md:pr-10">
                    <p className="text-5xl font-black mb-2">$15.000<span className="text-xl text-slate-400 font-semibold">/mes</span></p>
                    <p className="text-sm font-bold text-slate-500">Costo fijo. Sin comisiones ocultas.</p>
                </div>

                <div className="space-y-4 md:pl-6">
                    {["Reservas Ilimitadas", "Integración Mercado Pago", "Módulo Buffet POS", "Analíticas Gerenciales", "Soporte WhatsApp"].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <CheckCircle2 className="text-[#10b981] w-5 h-5 shrink-0"/>
                            <span className="font-bold text-slate-700 text-sm">{feature}</span>
                        </div>
                    ))}
                    <button onClick={() => navigate("/auth/login")} className="w-full mt-6 bg-[#10b981] text-white py-4 rounded-xl font-black hover:opacity-90 transition-opacity">
                        Comenzar 14 días Gratis
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* ─── Formulario de Contacto Prolijo ─── */}
      <section id="contacto" className="py-24 bg-white text-slate-900">
          <div className="container-w max-w-5xl px-6 xl:px-10">
              <div className="grid md:grid-cols-2 gap-16 items-center bg-[#f8fafc] border border-slate-200 rounded-[2.5rem] p-10 xl:p-16">
                  
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tighter">¿Querés ver el sistema por dentro?</h2>
                    <p className="text-slate-500 font-medium leading-relaxed max-w-sm">
                        Dejanos tus datos y un especialista te va a agendar una Demo de 15' por WhatsApp.
                    </p>
                  </div>

                  <div>
                      {formStatus === "sent" ? (
                          <div className="bg-green-50 border border-green-100 text-green-700 p-8 rounded-3xl text-center">
                              <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
                              <h3 className="text-xl font-black mb-2">¡Datos enviados!</h3>
                              <p className="font-medium text-sm">Nos contactaremos con vos a la brevedad.</p>
                          </div>
                      ) : (
                          <form onSubmit={handleContactSubmit} className="space-y-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                              <div className="relative">
                                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                  <input type="text" required placeholder="Nombre del complejo" className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 font-semibold text-sm outline-none focus:border-[#10b981] transition-colors" />
                              </div>
                              <div className="relative">
                                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                  <input type="tel" required placeholder="WhatsApp (con código de área)" className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 font-semibold text-sm outline-none focus:border-[#10b981] transition-colors" />
                              </div>
                              <div className="relative">
                                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                  <input type="email" required placeholder="Tu email" className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 font-semibold text-sm outline-none focus:border-[#10b981] transition-colors" />
                              </div>
                              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-sm hover:bg-slate-800 transition-colors mt-2">
                                  Solicitar Demo Gratuita
                              </button>
                          </form>
                      )}
                  </div>
              </div>
          </div>
      </section>

      {/* ─── FAQs ─── */}
      <section id="faq" className="py-20 bg-[#f8fafc] text-slate-900">
          <div className="container max-w-3xl">
              <h2 className="text-3xl font-black text-center mb-10">Preguntas Frecuentes</h2>
              <div className="space-y-4">
                  {[
                      { q: "¿Tengo que instalar algo en mi PC?", a: "¡Para nada! MySpordate funciona 100% en la nube. Entrás desde cualquier navegador en tu PC o celular." },
                      { q: "¿Qué pasa si ya tengo reservas anotadas?", a: "Podés pasarlas fácilmente usando el módulo de carga manual o los Turnos Fijos." },
                      { q: "¿Cobran comisión por reserva?", a: "No. Solo pagás el costo fijo mensual. Las señas van directo a tu Mercado Pago." },
                  ].map((faq, i) => (
                      <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                          <h4 className="font-bold text-base mb-2 text-slate-800">{faq.q}</h4>
                          <p className="text-slate-500 font-medium text-sm">{faq.a}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="container-w px-6 xl:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="w-8 h-8 rounded-lg bg-[#10b981] flex items-center justify-center text-white font-extrabold text-sm">S</div>
            <span className="font-extrabold text-base text-slate-900">MySpordate</span>
          </div>
          <div className="flex gap-6 text-sm font-bold text-slate-400">
            <a href="#" className="hover:text-[#10b981]">Privacidad</a>
            <a href="mailto:contacto@myspordate.com" className="hover:text-[#10b981]">contacto@myspordate.com</a>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a href="https://wa.me/5491100000000" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="Contactar por WhatsApp">
        <MessageCircle className="text-white fill-white" size={26} />
      </a>
    </div>
  );
};

export default Landing;