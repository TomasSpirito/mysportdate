import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    console.log("Webhook recibido de Mercado Pago:", payload);

    if (payload.action === "payment.created" || payload.action === "payment.updated" || payload.type === "payment") {
      const paymentId = payload.data?.id || payload.id;

      const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""; 
      const supabase = createClient(supabaseUrl, supabaseKey);

      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const paymentData = await mpRes.json();

      if (paymentData.status === "approved" && paymentData.metadata) {
        const meta = paymentData.metadata;
        console.log("Pago aprobado. Metadata oculta:", meta);

        // --- EL FIX: Forzamos la hora literal ignorando zonas horarias ---
        // Usamos la "Z" para que si la cancha es a las 19:00, se guarde como 19:00:00 exacto
        const startString = `${meta.date}T${meta.time}:00.000Z`;
        const startDate = new Date(startString);
        
        // Sumamos 1 hora para calcular el end_time de la cancha
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

        const newBooking = {
          court_id: meta.court_id,
          start_time: startDate.toISOString(), 
          end_time: endDate.toISOString(),     
          user_name: meta.user_name,
          user_email: meta.user_email,
          user_phone: meta.user_phone,
          total_price: meta.total_price,
          deposit_amount: meta.deposit_amount,
          payment_status: meta.payment_status,
          status: "confirmed", 
          booking_type: "online"
        };

        console.log("Intentando insertar en Supabase:", newBooking);

        const { error } = await supabase.from("bookings").insert(newBooking);

        if (error) {
          console.error("ERROR DE SUPABASE AL CREAR RESERVA:", error);
        } else {
          console.log("¡RESERVA CREADA CON ÉXITO EN LA BASE DE DATOS!");
        }
      }
    }

    return new Response("OK", { status: 200 });

  } catch (err: unknown) {
    console.error("Error general en el Webhook:", err);
    return new Response("Procesado con errores", { status: 200 });
  }
});