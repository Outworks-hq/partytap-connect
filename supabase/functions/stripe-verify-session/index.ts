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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    // Find recent completed top-up sessions for this user
    const sessionsRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions?limit=20",
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    const sessions = await sessionsRes.json();

    let credited = 0;

    for (const session of sessions.data ?? []) {
      if (session.payment_status !== "paid") continue;
      if (session.metadata?.purpose !== "balance_topup") continue;
      if (session.metadata?.user_id !== userData.user.id) continue;

      // Skip if we've already recorded this session
      const { data: existing } = await admin
        .from("payment_intents")
        .select("id")
        .eq("stripe_payment_intent_id", session.id)
        .maybeSingle();

      if (existing) continue;

      const amount = Number(session.amount_total ?? 0) / 100;
      if (amount <= 0) continue;

      const { data: profile } = await admin
        .from("profiles")
        .select("balance")
        .eq("id", userData.user.id)
        .single();

      const newBalance = Number(profile?.balance ?? 0) + amount;

      await admin.from("profiles").update({ balance: newBalance }).eq("id", userData.user.id);

      await admin.from("payment_intents").insert({
        business_id: userData.user.id,
        stripe_payment_intent_id: session.id,
        amount,
        status: "succeeded",
      });

      credited += amount;
    }

    return json({ credited });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
