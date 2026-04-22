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

    // 1. Nos conectamos a la base de datos
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Buscamos los datos de la cancha y AGREGAMOS EL EMAIL DEL PREDIO ('email')
    const { data: courtData, error: courtError } = await supabase
      .from("courts")
      .select(`
        name,
        facilities (
          name,
          location,
          phone,
          whatsapp,
          cancellation_window_hours,
          email
        )
      `)
      .eq("id", record.court_id)
      .single();

    if (courtError || !courtData) throw new Error("No se encontraron los datos del predio");

    const facility = courtData.facilities;
    
    // Ajuste de hora argentina
    const dateObj = new Date(record.start_time);
    dateObj.setHours(dateObj.getHours() - 3);
    const formattedDate = dateObj.toISOString().split('T')[0];
    const formattedTime = dateObj.toISOString().split('T')[1].substring(0, 5);

    const cancelLink = `https://mysportdate-test.vercel.app/cancelar/${record.cancellation_token}`;

    // ==========================================
    // 3A. ENVÍO DE EMAIL AL CLIENTE (JUGADOR)
    // ==========================================
    const resCustomer = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "MySportdate <onboarding@resend.dev>",
        to: [record.user_email],
        subject: `¡Reserva Confirmada en ${facility.name}! ⚽`, 
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

    const dataCustomer = await resCustomer.json();

    // ==========================================
    // 3B. ENVÍO DE EMAIL AL ADMINISTRADOR (ACTUALIZADO: VERDE + BOTÓN)
    // ==========================================
    if (facility.email && record.booking_type === "online") {
      // Usamos una variable de entorno FRONTEND_URL (que configurarás en Supabase) o caemos en la de test por defecto
    const baseUrl = Deno.env.get("FRONTEND_URL") ?? "https://mysportdate-test.vercel.app";
    
    // Le pasamos la fecha exacta como parámetro en la URL
    const adminDashboardLink = `${baseUrl}/admin?date=${formattedDate}`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "MySportdate Notificaciones <onboarding@resend.dev>",
          to: [facility.email],
          subject: `🎉 Nueva Reserva Online: ${record.user_name} - ${formattedDate}`, 
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; background-color: #ffffff;">
              
              <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 25px;">
                <h2 style="margin: 0; font-size: 22px;">¡Nueva Reserva Recibida!</h2>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Un cliente acaba de reservar por la web</p>
              </div>
              
              <h3 style="color: #334155; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">📋 Datos del Turno</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f8fafc;"><strong>Cancha:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #f8fafc; text-align: right;">${courtData.name}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f8fafc;"><strong>Fecha:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #f8fafc; text-align: right;">${formattedDate}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f8fafc;"><strong>Horario:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #f8fafc; text-align: right;">${formattedTime} hs</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f8fafc;"><strong>Total a Cobrar:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #f8fafc; text-align: right; color: #16a34a; font-weight: bold;">$${record.total_price}</td></tr>
                <tr><td style="padding: 10px 0;"><strong>Seña Abonada:</strong></td><td style="padding: 10px 0; text-align: right; color: #16a34a; font-weight: bold;">$${record.deposit_amount}</td></tr>
              </table>

              <h3 style="color: #334155; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">👤 Datos del Cliente</h3>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                <p style="margin: 5px 0;"><strong>Nombre:</strong> ${record.user_name}</p>
                <p style="margin: 5px 0;"><strong>Teléfono:</strong> <a href="https://wa.me/${record.user_phone?.replace(/[^0-9]/g, '')}" style="color: #16a34a; text-decoration: none; font-weight: bold;">${record.user_phone}</a></p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${record.user_email}</p>
              </div>

              <div style="text-align: center;">
                <a href="${adminDashboardLink}" style="display: inline-block; background-color: #16a34a; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  Ver reserva en el calendario
                </a>
              </div>

              <div style="margin-top: 30px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <p style="font-size: 11px; color: #94a3b8; margin: 0;">Notificación enviada automáticamente por MySportdate</p>
              </div>
            </div>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, customer: dataCustomer }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});