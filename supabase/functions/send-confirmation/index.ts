import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { record } = await req.json(); // Supabase Webhook manda el registro aquí

    // Solo mandamos mail si la reserva está confirmada
    if (record.status !== "confirmed") {
      return new Response(JSON.stringify({ message: "No es una confirmación" }), { status: 200 });
    }

    // Armamos el link de cancelación con tu dominio de Vercel
    const cancelLink = `https://mysportdate-test.vercel.app/cancelar/${record.cancellation_token}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MySportdate <onboarding@resend.dev>", // Luego podrás usar tu propio dominio
        to: [record.user_email],
        subject: `¡Reserva Confirmada! - ${record.user_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
            <h2 style="color: #16a34a;">¡Todo listo, ${record.user_name}!</h2>
            <p>Tu reserva para el día <strong>${record.start_time.split('T')[0]}</strong> ha sido confirmada con éxito.</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Monto pagado:</strong> $${record.deposit_amount}</p>
              <p style="margin: 5px 0;"><strong>Estado:</strong> Confirmada ✅</p>
            </div>

            <p style="font-size: 14px; color: #666;">¿Tuviste un imprevisto? Podés cancelar tu reserva haciendo clic en el siguiente botón (sujeto a las políticas del club):</p>
            
            <a href="${cancelLink}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 25px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 10px;">
              Cancelar Reserva
            </a>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">Gracias por confiar en MySportdate.</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});