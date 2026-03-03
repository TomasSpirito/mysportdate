import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/admin");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityName.trim()) {
      toast({ title: "Ingresá el nombre de tu predio", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      if (data.user) {
        const { error: rpcError } = await supabase.rpc("create_facility_for_user" as any, { p_name: facilityName.trim() });
        if (rpcError) throw rpcError;
        navigate("/admin");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-2xl mx-auto mb-4">S</div>
          <h1 className="text-2xl font-extrabold text-secondary-foreground">Spordate</h1>
          <p className="text-sm text-sidebar-foreground opacity-60 mt-1">
            {isRegister ? "Creá tu cuenta de administrador" : "Ingresá a tu panel de administración"}
          </p>
        </div>
        <form onSubmit={isRegister ? handleRegister : handleLogin} className="bg-card rounded-2xl p-6 shadow-xl space-y-4">
          {isRegister && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Nombre de tu predio</label>
              <input type="text" value={facilityName} onChange={(e) => setFacilityName(e.target.value)}
                placeholder="Ej: Complejo Deportivo Norte"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mipredio.com" required
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" minLength={6} required
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRegister ? "Crear cuenta" : "Ingresar"}
          </button>
          <button type="button" onClick={() => setIsRegister(!isRegister)}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
            {isRegister ? "¿Ya tenés cuenta? Ingresá" : "¿No tenés cuenta? Registrate"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
