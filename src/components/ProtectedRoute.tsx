import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FacilityProvider } from "@/contexts/FacilityContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: facilityId, isLoading: facilityLoading } = useQuery({
    queryKey: ["user-facility", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_facility_id" as any, { p_user_id: user!.id });
      if (error) throw error;
      return data as string | null;
    },
    enabled: !!user,
  });

  if (authLoading || (user && facilityLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;

  if (!facilityId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-6">
          <p className="text-lg font-bold mb-2">Sin predio asignado</p>
          <p className="text-sm text-muted-foreground">Contactá al soporte.</p>
        </div>
      </div>
    );
  }

  return (
    <FacilityProvider facilityId={facilityId}>
      <Outlet />
    </FacilityProvider>
  );
};

export default ProtectedRoute;
