import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Matches the version used by stripe-connect-onboarding, which is the
// payload shape already proven against this Stripe account.
const STRIPE_VERSION = "2026-07-29.preview";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, email")
      .eq("id", userData.user.id)
      .single();

    let accountId = profile?.stripe_connect_account_id;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    // Create the connected account on first use. Same payload as
    // stripe-connect-onboarding so both paths produce identical accounts.
    if (!accountId) {
      const createRes = await fetch("https://api.stripe.com/v2/core/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Stripe-Version": STRIPE_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact_email: profile?.email ?? userData.user.email,
          dashboard: "express",
          defaults: {
            responsibilities: {
              fees_collector: "application",
              losses_collector: "application",
            },
          },
          identity: { country: "us" },
          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: {
                  stripe_transfers: { requested: true },
                },
              },
            },
          },
          include: ["configuration.recipient", "identity", "requirements"],
        }),
      });

      const created = await createRes.json();
      if (!createRes.ok) {
        return json({ error: created.error?.message ?? "Account creation failed" }, 500);
      }

      accountId = created.id;
      await supabase
        .from("profiles")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", userData.user.id);
    }

    // The Account Session powers the embedded onboarding component, so the
    // user completes verification inside PartyTap rather than being sent to
    // Stripe's hosted page. Stripe still owns KYC and compliance.
    const sessionRes = await fetch("https://api.stripe.com/v1/account_sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        account: accountId!,
        "components[account_onboarding][enabled]": "true",
      }).toString(),
    });

    const session = await sessionRes.json();
    if (!sessionRes.ok) {
      return json({ error: session.error?.message ?? "Could not start payout setup" }, 500);
    }

    return json({ clientSecret: session.client_secret, accountId });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
