import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PLATFORM_FEE_PERCENT = Number(Deno.env.get("PLATFORM_FEE_PERCENT") ?? "8");

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

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);

    const { claimId } = await req.json();
    if (!claimId) return json({ error: "Missing claimId" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    // ---------------------------------------------------------------
    // 1. VALIDATION - every check happens before the claim is locked,
    //    so a failed release always leaves the claim reusable.
    // ---------------------------------------------------------------

    const { data: claim } = await supabase
      .from("work_tab_claims")
      .select("id, user_id, status, work_tab_id, work_tabs(id, pay, business_id)")
      .eq("id", claimId)
      .single();

    if (!claim) return json({ error: "Claim not found" }, 404);

    const workTab: any = Array.isArray(claim.work_tabs) ? claim.work_tabs[0] : claim.work_tabs;
    if (!workTab || workTab.business_id !== userData.user.id) {
      return json({ error: "Not authorized for this Work Tab" }, 403);
    }
    if (claim.status === "paid") return json({ error: "Already paid" }, 400);
    if (!claim.user_id) return json({ error: "Claim has no recipient" }, 400);

    // Recipient must have completed Stripe Connect onboarding.
    // Service role is needed: the business owner cannot read another
    // user's profile row under RLS.
    const { data: recipient } = await admin
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", claim.user_id)
      .single();

    if (!recipient?.stripe_connect_account_id) {
      return json({ error: "Recipient hasn't connected a payout account yet." }, 400);
    }

    // Business must have a saved card to charge.
    const { data: businessProfile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userData.user.id)
      .single();

    if (!businessProfile?.stripe_customer_id) {
      return json({ error: "Add a payment method before releasing payment." }, 400);
    }

    const pmRes = await fetch(
      `https://api.stripe.com/v1/payment_methods?customer=${businessProfile.stripe_customer_id}&type=card&limit=1`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    const pms = await pmRes.json();
    const paymentMethodId = pms.data?.[0]?.id;

    if (!paymentMethodId) {
      return json({ error: "Add a payment method before releasing payment." }, 400);
    }

    const gross = Number(workTab.pay);
    const platformFee = Math.round(gross * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
    const net = Math.round((gross - platformFee) * 100) / 100;

    // ---------------------------------------------------------------
    // 2. LOCK - mark the claim paid atomically. Only one concurrent
    //    request can win, which prevents double charges.
    //    Everything after this rolls back on failure.
    // ---------------------------------------------------------------

    const { data: locked } = await admin
      .from("work_tab_claims")
      .update({ status: "paid" })
      .eq("id", claimId)
      .neq("status", "paid")
      .select("id");

    if (!locked || locked.length === 0) {
      return json({ error: "This payment is already being processed." }, 409);
    }

    const rollback = async () => {
      await admin.from("work_tab_claims").update({ status: "submitted" }).eq("id", claimId);
    };

    // ---------------------------------------------------------------
    // 3. CHARGE the business's saved card as a destination charge.
    //
    //    Stripe splits the payment in one step: the net amount goes to
    //    the recipient's connected account and the platform fee stays
    //    with us. This avoids a separate transfer, which would require
    //    the platform to hold a settled available balance - card funds
    //    stay pending for days after a charge.
    // ---------------------------------------------------------------

    const chargeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(Math.round(gross * 100)),
        currency: "usd",
        customer: businessProfile.stripe_customer_id,
        payment_method: paymentMethodId,
        off_session: "true",
        confirm: "true",
        "transfer_data[destination]": recipient.stripe_connect_account_id,
        application_fee_amount: String(Math.round(platformFee * 100)),
        "metadata[work_tab_id]": workTab.id,
        "metadata[claim_id]": claim.id,
      }).toString(),
    });

    const charge = await chargeRes.json();
    if (!chargeRes.ok || charge.status !== "succeeded") {
      await rollback();
      return json(
        { error: charge.error?.message ?? "Card payment failed. Check your payment method." },
        400,
      );
    }

    // ---------------------------------------------------------------
    // 4. RECORD the payout.
    // ---------------------------------------------------------------

    await admin.from("payouts").insert({
      claim_id: claim.id,
      recipient_id: claim.user_id,
      stripe_transfer_id: charge.latest_charge ?? charge.id,
      amount: net,
      platform_fee: platformFee,
      status: "paid",
    });

    return json({ ok: true, transferId: charge.id, net, platformFee });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
