import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Importamos el cliente de Supabase específico para Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    console.log("Webhook recibido de Mercado Pago:", payload);

    // Mercado Pago envía notificaciones de varios tipos. Solo nos importa "payment"
    if (payload.action === "payment.created" || payload.type === "payment") {
      // El payload del webhook solo trae el ID del pago, no los detalles.
      // Tenemos que ir a buscar la información completa usando ese ID.
      const paymentId = payload.data?.id || payload.id;

      const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""; 
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 1. Buscamos los detalles reales del pago en la API de Mercado Pago
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const paymentData = await mpRes.json();

      // 2. Si el pago fue aprobado, sacamos la metadata que escondimos en la Fase 1
      if (paymentData.status === "approved" && paymentData.metadata) {
        const meta = paymentData.metadata;
        console.log("Pago aprobado. Insertando reserva con metadata:", meta);

        // 3. Armamos la reserva con los datos exactos
        const newBooking = {
          court_id: meta.court_id,
          date: meta.date,
          time: meta.time, 
          user_name: meta.user_name,
          user_email: meta.user_email,
          user_phone: meta.user_phone,
          total_price: meta.total_price,
          deposit_amount: meta.deposit_amount,
          payment_status: meta.payment_status,
          booking_type: "online"
        };

        // 4. Insertamos en la tabla 'bookings' (Ajustar nombre de la tabla si es distinto)
        const { error } = await supabase.from("bookings").insert(newBooking);

        if (error) {
          console.error("Error de Supabase al crear reserva:", error);
        } else {
          console.log("¡Reserva creada con éxito en el sistema!");
        }
      }
    }

    // A Mercado Pago SIEMPRE hay que devolverle un 200 OK rápido, 
    // sino asume que nuestro servidor se cayó y reintenta enviar la notificación infinitas veces.
    return new Response("OK", { status: 200 });

  } catch (err: unknown) {
    console.error("Error general en el Webhook:", err);
    // Devolvemos 200 incluso si hay error para que MP no nos sature con reintentos
    return new Response("Procesado con errores", { status: 200 });
  }
});