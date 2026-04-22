import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFacilityId } from "@/contexts/FacilityContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface Notification {
  id: string;
  facility_id: string;
  type: 'new_booking' | 'cancellation' | 'buffet_sale' | 'low_stock';
  content: any;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const facilityId = useFacilityId();
  const queryClient = useQueryClient();

  // 1. Query para obtener las notificaciones (limite de 20 para el panel rápido)
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("*")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!facilityId,
  });

  // 2. Mutación para marcar como leída
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications" as any)
        .update({ is_read: true } as any)
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", facilityId] });
    },
  });

  // 3. Lógica de Realtime
  useEffect(() => {
    if (!facilityId) return;

    // Suscribirse a cambios en la tabla 'notifications' para este predio
    const channel = supabase
      .channel(`notifications-realtime-${facilityId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `facility_id=eq.${facilityId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;

          // Refrescar la lista de notificaciones en el cache
          queryClient.invalidateQueries({ queryKey: ["notifications", facilityId] });

          // Disparar el Popup (Toast) visual
          showNotificationToast(newNotif);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [facilityId, queryClient]);

  // Helper para mostrar el mensaje adecuado según el tipo
  const showNotificationToast = (notif: Notification) => {
    let title = "Nueva actualización";
    let description = "Tienes una nueva notificación.";

    if (notif.type === 'new_booking') {
      title = "📅 ¡Nueva Reserva!";
      const startDate = new Date(notif.content.start_time);
      const formattedDate = format(startDate, "d 'de' MMMM", { locale: es });
      const hour = startDate.getHours();
      description = `${notif.content.player_name} reservó para el ${formattedDate} a las ${hour}:00hs`;
    } else if (notif.type === 'cancellation') {
      title = "🚫 Turno Cancelado";
      description = `Se ha liberado un horario en tu agenda.`;
    } else if (notif.type === 'buffet_sale') {
      title = "🍔 Venta en Buffet";
      description = `Nueva venta registrada por $${notif.content.total}`;
    }

    toast({
      title,
      description,
      variant: "default",
    });
  };

  return {
    notifications,
    isLoading,
    markAsRead: markAsRead.mutate,
    unreadCount: notifications.filter(n => !n.is_read).length
  };
}