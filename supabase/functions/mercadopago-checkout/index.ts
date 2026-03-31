import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  // 1. Manejo de CORS fundamental para evitar el error en rojo del navegador
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const facilityId = payload.facility_id; 
    if (!facilityId) {
        throw new Error("Falta el ID del predio (facility_id) en la petición.");
    }

    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // @ts-ignore
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""; 
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: facility, error: facilityError } = await supabase
        .from("facilities")
        .select("mp_access_token")
        .eq("id", facilityId)
        .single();

    if (facilityError || !facility?.mp_access_token) {
        throw new Error("Este predio no tiene una cuenta de Mercado Pago vinculada.");
    }

    const MP_ACCESS_TOKEN = facility.mp_access_token;

    const successUrl = payload.back_urls?.success || "https://mysportdate-test.vercel.app/";
    const failureUrl = payload.back_urls?.failure || "https://mysportdate-test.vercel.app/";
    const pendingUrl = payload.back_urls?.pending || "https://mysportdate-test.vercel.app/";

    const preference = {
      items: [
        {
          title: payload.title || "Reserva en MySportdate",
          quantity: 1,
          unit_price: Number(payload.unit_price),
          currency_id: "ARS",
        },
      ],
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl
      },
      auto_return: "approved",
      external_reference: payload.external_reference || "RESERVA",
      metadata: payload.booking_data || {},
      notification_url: "https://acfbifypaqbbokxvkmpo.supabase.co/functions/v1/mercadopago-webhook",
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      throw new Error(`Error MP: ${mpData.message || 'Error desconocido'}`);
    }

    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        id: mpData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en CHECKOUT:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});