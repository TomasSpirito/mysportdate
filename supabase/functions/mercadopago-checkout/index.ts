import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// @ts-ignore
Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    console.log("Webhook recibido de Mercado Pago:", payload);

    if (payload.action === "payment.created" || payload.action === "payment.updated" || payload.type === "payment") {
      const paymentId = payload.data?.id || payload.id;
      const mpUserId = payload.user_id; // <- MP nos dice quién es el dueño que cobró

      if (!mpUserId) throw new Error("No viene user_id en el webhook");

      // @ts-ignore
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      // @ts-ignore
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""; 
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 1. Buscamos el token del dueño de la cancha usando el mp_user_id
      const { data: facility, error: facilityError } = await supabase
        .from("facilities")
        .select("mp_access_token")
        .eq("mp_user_id", mpUserId.toString())
        .single();

      if (facilityError || !facility?.mp_access_token) {
        throw new Error("No se encontró el token de MP para este predio");
      }

      const MP_ACCESS_TOKEN = facility.mp_access_token;

      // 2. Verificamos el pago con el token correcto
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const paymentData = await mpRes.json();

      if (paymentData.status === "approved" && paymentData.metadata) {
        const meta = paymentData.metadata;
        console.log("Pago aprobado. Metadata:", meta);

        const startString = `${meta.date}T${meta.time}:00.000Z`;
        const startDate = new Date(startString);
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

        const { error } = await supabase.from("bookings").insert(newBooking);

        if (error) {
          console.error("ERROR AL CREAR RESERVA:", error);
        } else {
          console.log("¡RESERVA CREADA CON ÉXITO!");
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err: unknown) {
    console.error("Error general en Webhook:", err);
    return new Response("Procesado con errores", { status: 200 });
  }
});