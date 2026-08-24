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

    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", userData.user.id)
      .single();

    if (!profile?.stripe_connect_account_id) {
      return json({ onboarded: false });
    }

    const accRes = await fetch(
      `https://api.stripe.com/v2/core/accounts/${profile.stripe_connect_account_id}?include=configuration.recipient`,
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")!}`,
          "Stripe-Version": "2026-07-29.preview",
        },
      },
    );

    const account = await accRes.json();
    const onboarded =
      account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ===
      "active";

    await admin
      .from("profiles")
      .update({ stripe_connect_onboarded: onboarded })
      .eq("id", userData.user.id);

    return json({ onboarded });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
