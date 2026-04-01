import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    
    // Obtenemos la reserva actualizada
    const record = payload.record
    const oldRecord = payload.old_record

    // Seguridad: Verificamos que realmente haya pasado a "cancelled" y que tenga email
    if (record.status !== 'cancelled' || oldRecord?.status === 'cancelled' || !record.user_email) {
      return new Response(JSON.stringify({ message: "No corresponde enviar mail" }), { status: 200 })
    }

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

    // Buscar el nombre de la cancha
    const { data: court } = await supabase
      .from('courts')
      .select('name')
      .eq('id', record.court_id)
      .single()

    // Formatear Fecha y Hora a la zona horaria de Argentina
    const dateObj = new Date(record.start_time)
    const dateStr = dateObj.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' })
    const timeStr = dateObj.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false })

    // Lógica para explicar qué pasó con la plata (Seña)
    let refundText = "";
    if (record.deposit_amount > 0) {
        if (record.refund_status === 'refunded') {
            refundText = `<div style="background-color: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; margin-top: 15px; font-weight: bold; border: 1px solid #bbf7d0;">✅ Se ha gestionado la devolución de tu seña abonada ($${record.deposit_amount.toLocaleString()}).</div>`;
        } else if (record.refund_status === 'kept') {
            refundText = `<div style="background-color: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-top: 15px; font-weight: bold; border: 1px solid #fecaca;">⚠️ La seña abonada ($${record.deposit_amount.toLocaleString()}) ha sido retenida según las políticas de cancelación del predio.</div>`;
        } else {
            refundText = `<div style="background-color: #ffedd5; color: #9a3412; padding: 12px; border-radius: 8px; margin-top: 15px; font-weight: bold; border: 1px solid #fed7aa;">⏳ El estado de tu seña ($${record.deposit_amount.toLocaleString()}) está siendo revisado por la administración.</div>`;
        }
    }

    // Lógica para el Motivo de Cancelación
    let reasonText = "Motivo de la cancelación: ";
    if (record.cancellation_reason === 'club') reasonText += "<b>Inconvenientes climáticos o técnicos en el predio.</b>";
    else if (record.cancellation_reason === 'no_show') reasonText += "<b>Ausencia sin aviso previo (No Show).</b>";
    else reasonText += "<b>Cancelación solicitada por el cliente.</b>";

    // El HTML Premium para el correo
    const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; background-color: #f4f4f5; padding: 40px 20px; text-align: center;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e4e4e7;">
        <h2 style="color: #ef4444; margin-bottom: 15px; font-size: 24px; font-weight: 900;">Reserva Cancelada ❌</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px; font-weight: 500;">
          Hola <b>${record.user_name || 'Jugador'}</b>, te confirmamos que tu turno ha sido liberado exitosamente.
        </p>
        
        <div style="background-color: #f8fafc; border-radius: 16px; padding: 20px; margin-bottom: 20px; text-align: left; border: 1px solid #f1f5f9;">
            <p style="margin: 8px 0; color: #334155; font-size: 14px;">📅 <b>Fecha:</b> ${dateStr}</p>
            <p style="margin: 8px 0; color: #334155; font-size: 14px;">⏰ <b>Horario:</b> ${timeStr} hs</p>
            <p style="margin: 8px 0; color: #334155; font-size: 14px;">🏟️ <b>Cancha:</b> ${court?.name || 'Cancha'}</p>
        </div>

        <p style="color: #64748b; font-size: 14px; margin-bottom: 5px;">${reasonText}</p>
        
        ${refundText}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #e4e4e7;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Si tenés alguna duda, comunicate por WhatsApp con el predio.
          </p>
        </div>
      </div>
    </div>
    `;

    // Envío del email vía Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'MySportdate <onboarding@resend.dev>',
        to: [record.user_email],
        subject: 'Tu reserva ha sido cancelada ❌',
        html: html,
      })
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})