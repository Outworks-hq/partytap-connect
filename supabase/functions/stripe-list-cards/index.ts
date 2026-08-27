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
      .select("stripe_customer_id")
      .eq("id", userData.user.id)
      .single();

    if (!profile?.stripe_customer_id) return json({ cards: [] });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const pmRes = await fetch(
      `https://api.stripe.com/v1/payment_methods?customer=${profile.stripe_customer_id}&type=card`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );

    const pms = await pmRes.json();
    if (!pmRes.ok) return json({ error: pms.error?.message ?? "Could not load cards" }, 500);

    const cards = (pms.data ?? []).map((pm: any) => ({
      id: pm.id,
      brand: pm.card?.brand ?? "card",
      last4: pm.card?.last4 ?? "----",
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }));

    return json({ cards });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
