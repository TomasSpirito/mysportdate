import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // @ts-ignore
  const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  
  if (!MP_ACCESS_TOKEN) {
    return new Response(
      JSON.stringify({ error: "MercadoPago no configurado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = await req.json();
    
    // SOLUCIÓN DEFINITIVA: Usamos tu dominio de Vercel que ya es HTTPS y válido para MP
    const productionUrl = "https://mysportdate.vercel.app/";

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
        success: productionUrl,
        failure: productionUrl,
        pending: productionUrl
      },
      auto_return: "approved",
      external_reference: payload.external_reference || "RESERVA",
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
      return new Response(
        JSON.stringify({ error: mpData.message, details: mpData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});