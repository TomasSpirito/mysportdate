import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = Deno.env.get("DEMO_REQUESTS_EMAIL") ?? "contacto@mysportdate.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { facilityName, phone, email } = await req.json();

    if (!facilityName || !phone || !email) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. Notificación al equipo MySportdate ──────────────────────────────
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MySportdate <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `🎯 Nueva solicitud de demo: ${facilityName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #16a34a; padding: 24px; text-align: center;">
              <h2 style="margin: 0; color: white; font-size: 22px;">¡Nueva Solicitud de Demo!</h2>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">Un predio quiere conocer MySportdate</p>
            </div>
            <div style="padding: 28px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; width: 140px;">🏟️ Nombre del predio</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; font-size: 14px;">${facilityName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">📱 WhatsApp</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px;">
                    <a href="https://wa.me/${phone.replace(/[^0-9]/g, "")}" style="color: #16a34a; font-weight: 700; text-decoration: none;">${phone}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #64748b; font-size: 13px;">✉️ Email</td>
                  <td style="padding: 12px 0; font-size: 14px;">${email}</td>
                </tr>
              </table>

              <div style="text-align: center; margin-top: 28px;">
                <a href="https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=Hola%20${encodeURIComponent(facilityName)}!%20Soy%20del%20equipo%20de%20MySportdate.%20Vi%20que%20solicitaste%20una%20demo%2C%20%C2%BFcuando%20te%20viene%20bien%20hablar?"
                  style="display: inline-block; background: #25D366; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                  📲 Contactar por WhatsApp
                </a>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">Solicitud recibida a través del formulario en mysportdate.com</p>
            </div>
          </div>
        `,
      }),
    });

    // ── 2. Confirmación automática al solicitante ──────────────────────────
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MySportdate <onboarding@resend.dev>",
        to: [email],
        subject: "¡Recibimos tu solicitud! Te contactamos pronto 🚀",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #059669, #0891b2); padding: 32px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">⚽</div>
              <h2 style="margin: 0; color: white; font-size: 24px; font-weight: 900;">¡Solicitud recibida!</h2>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Nos ponemos en contacto a la brevedad</p>
            </div>
            <div style="padding: 32px;">
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                Hola 👋, recibimos la solicitud de demo para <strong>${facilityName}</strong>.
              </p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                Un miembro de nuestro equipo te va a contactar por WhatsApp al número <strong>${phone}</strong> para coordinar una demostración personalizada de 15 minutos.
              </p>

              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px; color: #166534; font-size: 14px;">Lo que vas a ver en la demo:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 13px; line-height: 2;">
                  <li>Agenda inteligente y reservas online</li>
                  <li>Cobro automático de señas con Mercado Pago</li>
                  <li>Módulo de Buffet / Kiosco (POS)</li>
                  <li>Analíticas y reportes financieros</li>
                </ul>
              </div>

              <p style="color: #64748b; font-size: 13px;">
                ¿Tenés alguna pregunta mientras tanto? Escribinos directamente a
                <a href="mailto:contacto@mysportdate.com" style="color: #059669;">contacto@mysportdate.com</a>
              </p>
            </div>
            <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #334155;">MySportdate</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">Plataforma de gestión para predios deportivos</p>
            </div>
          </div>
        `,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
