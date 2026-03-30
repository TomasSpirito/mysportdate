import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirectUri, facilityId } = await req.json()

    const MP_CLIENT_ID = Deno.env.get('MP_CLIENT_ID')
    const MP_CLIENT_SECRET = Deno.env.get('MP_CLIENT_SECRET')

    // 1. Canjeamos el código temporal por el Access Token de MP
    const mpResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: MP_CLIENT_ID!,
        client_secret: MP_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    })

    const mpData = await mpResponse.json()

    if (!mpResponse.ok) {
      throw new Error(mpData.message || 'Error al canjear código en Mercado Pago')
    }

    // 2. Guardamos los tokens en la tabla 'facilities'
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabaseAdmin
      .from('facilities')
      .update({
        mp_access_token: mpData.access_token,
        mp_refresh_token: mpData.refresh_token,
        mp_user_id: mpData.user_id.toString(),
        mp_connected: true
      })
      .eq('id', facilityId)

    if (dbError) throw dbError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})