import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { record } = await req.json();

    if (record.status !== "confirmed") {
      return new Response(JSON.stringify({ message: "No es una confirmación" }), { status: 200 });
    }

    // 1. Nos conectamos a la base de datos desde la función
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Buscamos el nombre de la cancha y los datos del predio
    const { data: courtData, error: courtError } = await supabase
      .from("courts")
      .select(`
        name,
        facilities (
          name,
          location,
          phone,
          whatsapp,
          cancellation_window_hours
        )
      `)
      .eq("id", record.court_id)
      .single();

    if (courtError || !courtData) throw new Error("No se encontraron los datos del predio");

    const facility = courtData.facilities;
    
    // Ajuste de hora restando 3 horas para que el mail diga la hora argentina correcta
    const dateObj = new Date(record.start_time);
    dateObj.setHours(dateObj.getHours() - 3);
    const formattedDate = dateObj.toISOString().split('T')[0];
    const formattedTime = dateObj.toISOString().split('T')[1].substring(0, 5);

    const cancelLink = `https://mysportdate-test.vercel.app/cancelar/${record.cancellation_token}`;

    // 3. Armamos un mail súper completo
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MySportdate <onboarding@resend.dev>",
        to: [record.user_email],
        subject: `¡Reserva Confirmada en ${facility.name}! 🎾`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
            <h2 style="color: #16a34a; text-align: center;">¡Tu turno está confirmado!</h2>
            <p style="text-align: center; color: #555;">Hola <strong>${record.user_name}</strong>, te esperamos en <strong>${facility.name}</strong>.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #334155; font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">Detalles del partido</h3>
              <p style="margin: 8px 0;">📅 <strong>Fecha:</strong> ${formattedDate}</p>
              <p style="margin: 8px 0;">⏰ <strong>Horario:</strong> ${formattedTime} hs</p>
              <p style="margin: 8px 0;">🏟️ <strong>Cancha:</strong> ${courtData.name}</p>
              <p style="margin: 8px 0;">📍 <strong>Dirección:</strong> <a href="https://maps.google.com/?q=${encodeURIComponent(facility.location)}" target="_blank" style="color: #2563eb;">${facility.location}</a></p>
            </div>

            <div style="background: #ecfdf5; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #d1fae5;">
              <p style="margin: 5px 0;">💰 <strong>Monto pagado:</strong> $${record.deposit_amount}</p>
              ${record.total_price > record.deposit_amount ? `<p style="margin: 5px 0; color: #b45309;"><strong>Resta abonar en el club:</strong> $${record.total_price - record.deposit_amount}</p>` : ''}
            </div>

            <p style="font-size: 14px; color: #666;">¿Tenés alguna duda? Comunicate con el predio enviando un WhatsApp al <a href="https://wa.me/${facility.whatsapp?.replace(/[^0-9]/g, '')}" style="color: #2563eb;">${facility.whatsapp}</a>.</p>
            
            <div style="text-align: center; margin-top: 30px;">
                <p style="font-size: 12px; color: #999;">¿Tuviste un imprevisto? Podés cancelar tu reserva hasta ${facility.cancellation_window_hours} horas antes haciendo clic abajo:</p>
                <a href="${cancelLink}" style="display: inline-block; background: #ef4444; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                  Cancelar Reserva
                </a>
            </div>
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