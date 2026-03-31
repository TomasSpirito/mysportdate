import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Calendar, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CancelBooking = () => {
  const { token } = useParams<{ token: string }>();
  const [isCancelled, setIsCancelled] = useState(false);

  // Buscamos la reserva usando el token mágico, trayendo también datos de la cancha y el predio
  const { data: bookingData, isLoading, error } = useQuery({
    queryKey: ["cancel-booking", token],
    queryFn: async () => {
      if (!token) throw new Error("Token no válido");
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          courts (
            name,
            facilities (
              name,
              cancellation_window_hours
            )
          )
        `)
        .eq("cancellation_token", token)
        .single() as any; // <-- ESTA ES LA MAGIA PARA CALLAR A TYPESCRIPT

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bookings")
        .update({ 
          status: "cancelled", 
          cancelled_at: new Date().toISOString() 
        })
        .eq("cancellation_token", token);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setIsCancelled(true);
      toast({ title: "Reserva cancelada con éxito" });
    },
    onError: () => {
      toast({ title: "Error al cancelar", description: "Intentá de nuevo más tarde", variant: "destructive" });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Buscando tu reserva...</p>
      </div>
    );
  }

  if (error || !bookingData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <XCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-black mb-2">Enlace no válido</h1>
        <p className="text-muted-foreground mb-6">El enlace de cancelación es incorrecto o ya expiró.</p>
        <Link to="/" className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold">Volver al inicio</Link>
      </div>
    );
  }

  // Desestructuramos para que sea más fácil de leer
  const courtName = bookingData.courts?.name;
  const facilityName = bookingData.courts?.facilities?.name;
  const cancelWindow = bookingData.courts?.facilities?.cancellation_window_hours || 0;
  
  // Lógica de tiempo
  const startTime = parseISO(bookingData.start_time);
  const hoursUntilBooking = differenceInHours(startTime, new Date());
  const isTooLate = hoursUntilBooking < cancelWindow;
  const alreadyCancelled = bookingData.status === "cancelled" || isCancelled;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="glass-card max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-xl border border-border/50">
        
        {alreadyCancelled ? (
          <div className="text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-black mb-2">Turno Cancelado</h1>
            <p className="text-muted-foreground mb-6 text-sm">Tu reserva ha sido cancelada exitosamente y el horario fue liberado.</p>
            <Link to="/" className="block w-full bg-secondary text-secondary-foreground px-6 py-3.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
              Volver al inicio
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-black mb-1">Cancelar Reserva</h1>
              <p className="text-muted-foreground text-sm">Estás a punto de cancelar tu turno.</p>
            </div>

            <div className="bg-muted/30 rounded-2xl p-4 border border-border mb-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold">{facilityName} - {courtName}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span className="capitalize font-medium">{format(startTime, "EEEE d 'de' MMMM", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium">{format(startTime, "HH:mm")} hs</span>
              </div>
            </div>

            {isTooLate ? (
              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 text-center">
                <p className="text-sm font-bold text-destructive mb-1">Ya no podés cancelar</p>
                <p className="text-xs text-muted-foreground">
                  El club exige un mínimo de <strong className="text-foreground">{cancelWindow} horas</strong> de anticipación para cancelaciones. Faltan menos de {hoursUntilBooking} horas para tu turno.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <button 
                  onClick={() => cancelMutation.mutate()} 
                  disabled={cancelMutation.isPending}
                  className="w-full bg-destructive text-destructive-foreground px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-destructive/90 transition-colors shadow-lg shadow-destructive/20"
                >
                  {cancelMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                  Sí, cancelar reserva
                </button>
                <p className="text-[10px] text-center text-muted-foreground px-4">
                  Al confirmar, el turno quedará libre para otros jugadores. 
                  {bookingData.deposit_amount > 0 && " Comunicate con el club para gestionar la devolución de tu seña."}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CancelBooking;