import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return json({ error: "Not authenticated" }, 401);

    const { amount } = await req.json();
    const amountNum = Number(amount);
    if (!amountNum || amountNum < 1) {
      return json({ error: "Enter an amount of at least $1." }, 400);
    }

    const origin = req.headers.get("origin") ?? "https://www.partytap.co";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const params = new URLSearchParams({
      mode: "payment",
      success_url: `${origin}/dashboard?funded=true`,
      cancel_url: `${origin}/settings`,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": "PartyTap balance top-up",
      "line_items[0][price_data][unit_amount]": String(Math.round(amountNum * 100)),
      "line_items[0][quantity]": "1",
      "metadata[user_id]": userData.user.id,
      "metadata[purpose]": "balance_topup",
      "payment_intent_data[metadata][user_id]": userData.user.id,
      "payment_intent_data[metadata][purpose]": "balance_topup",
    });

    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await sessionRes.json();
    if (!sessionRes.ok) {
      return json({ error: session.error?.message ?? "Could not start checkout." }, 500);
    }

    return json({ url: session.url });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
