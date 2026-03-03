import { useParams, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FacilityProvider } from "@/contexts/FacilityContext";
import { Loader2 } from "lucide-react";

const TenantRoute = () => {
  const { slug } = useParams();

  const { data: facility, isLoading } = useQuery({
    queryKey: ["facility-by-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-6">
          <p className="text-6xl mb-4">🏟️</p>
          <h1 className="text-2xl font-extrabold mb-2">Predio no encontrado</h1>
          <p className="text-sm text-muted-foreground mb-4">El enlace no corresponde a ningún predio registrado.</p>
          <a href="/" className="text-primary font-semibold hover:underline">Volver al inicio</a>
        </div>
      </div>
    );
  }

  return (
    <FacilityProvider facilityId={facility.id}>
      <Outlet />
    </FacilityProvider>
  );
};

export default TenantRoute;
