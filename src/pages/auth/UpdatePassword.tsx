import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { AuthError } from "@supabase/supabase-js";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Verificamos si el usuario llegó acá a través de un link válido de recuperación
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Enlace inválido", description: "Tu enlace expiró o es inválido. Volvé a solicitar uno.", variant: "destructive" });
        navigate("/auth/login");
      }
    };
    checkSession();
  }, [navigate]);

  const handleError = (err: unknown) => {
    if (err instanceof Error || err instanceof AuthError) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } else {
      toast({ title: "Error", description: "Ocurrió un error inesperado.", variant: "destructive" });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Atención", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      toast({ title: "¡Contraseña actualizada!", description: "Ya podés acceder a tu panel con tu nueva clave.", variant: "default" });
      navigate("/admin");
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-2xl mx-auto mb-4">M</div>
          <h1 className="text-2xl font-extrabold text-secondary-foreground">MySportdate</h1>
          <p className="text-sm text-sidebar-foreground opacity-60 mt-1">
            Elegí tu nueva contraseña
          </p>
        </div>
        
        <form onSubmit={handleUpdatePassword} className="bg-card rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Nueva Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              minLength={6} 
              required
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" 
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar contraseña
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;