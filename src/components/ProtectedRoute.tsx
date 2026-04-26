import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FacilityProvider } from "@/contexts/FacilityContext";
import { Loader2 } from "lucide-react";
import SubscriptionGate from "@/components/SubscriptionGate";

interface FacilityAccess {
  id: string;
  hasAccess: boolean;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
}

const ProtectedRoute = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: facilityAccess, isLoading: facilityLoading } = useQuery<FacilityAccess | null>({
    queryKey: ["user-facility", user?.id],
    queryFn: async () => {
      const { data: facilityId, error } = await supabase.rpc("get_user_facility_id" as any, {
        p_user_id: user!.id,
      });
      if (error) throw error;
      if (!facilityId) return null;

      const [accessResult, facilityResult] = await Promise.all([
        supabase.rpc("facility_has_access" as any, { p_facility_id: facilityId }),
        supabase
          .from("facilities")
          .select("subscription_status, trial_ends_at")
          .eq("id", facilityId as string)
          .single(),
      ]);

      return {
        id: facilityId as string,
        hasAccess: (accessResult.data as boolean) ?? false,
        subscriptionStatus: facilityResult.data?.subscription_status ?? null,
        trialEndsAt: facilityResult.data?.trial_ends_at ?? null,
      };
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

  if (!facilityAccess?.id) {
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
    <FacilityProvider facilityId={facilityAccess.id}>
      {facilityAccess.hasAccess ? (
        <Outlet />
      ) : (
        <SubscriptionGate
          subscriptionStatus={facilityAccess.subscriptionStatus}
          trialEndsAt={facilityAccess.trialEndsAt}
        />
      )}
    </FacilityProvider>
  );
};

export default ProtectedRoute;
