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

    // Load the claim and verify the caller owns the parent Work Tab
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

    // Claim this release atomically — only one concurrent request can win.
    const adminClaim = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: claimed } = await adminClaim
      .from("work_tab_claims")
      .update({ status: "paid" })
      .eq("id", claimId)
      .neq("status", "paid")
      .select("id");

    if (!claimed || claimed.length === 0) {
      return json({ error: "This payment is already being processed." }, 409);
    }

    // Recipient must have completed Stripe Connect onboarding.
    // Use service role: the caller is the business owner (verified above) and
    // can't read another user's profile row under RLS.
    const adminLookup = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: recipient, error: recipientError } = await adminLookup
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", claim.user_id)
      .single();

    console.log("DIAG claim.user_id:", claim.user_id);
    console.log("DIAG recipient:", JSON.stringify(recipient));
    console.log("DIAG recipientError:", JSON.stringify(recipientError));

    if (!recipient?.stripe_connect_account_id) {
      return json({
        error: "Recipient hasn't connected a payout account yet.",
        debug: { userId: claim.user_id, recipient, recipientError },
      }, 400);
    }

    const gross = Number(workTab.pay);
    const platformFee = Math.round(gross * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
    const net = Math.round((gross - platformFee) * 100) / 100;
    const netCents = Math.round(net * 100);

    // Charge the business's saved card for the full amount
    const adminCharge = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: businessProfile } = await adminCharge
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userData.user.id)
      .single();

    if (!businessProfile?.stripe_customer_id) {
      return json({ error: "Add a payment method before releasing payment." }, 400);
    }

    // Find their saved card
    const pmRes = await fetch(
      `https://api.stripe.com/v1/payment_methods?customer=${businessProfile.stripe_customer_id}&type=card&limit=1`,
      { headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")!}` } },
    );
    const pms = await pmRes.json();
    const paymentMethodId = pms.data?.[0]?.id;

    if (!paymentMethodId) {
      return json({ error: "Add a payment method before releasing payment." }, 400);
    }

    // Charge it (off-session, since the card was saved earlier)
    const chargeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")!}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(Math.round(gross * 100)),
        currency: "usd",
        customer: businessProfile.stripe_customer_id,
        payment_method: paymentMethodId,
        off_session: "true",
        confirm: "true",
        "metadata[work_tab_id]": workTab.id,
        "metadata[claim_id]": claim.id,
      }).toString(),
    });

    const charge = await chargeRes.json();
    if (!chargeRes.ok || charge.status !== "succeeded") {
      // Roll the claim back so it can be retried
      await adminCharge
        .from("work_tab_claims")
        .update({ status: "submitted" })
        .eq("id", claimId);
      return json(
        { error: charge.error?.message ?? "Card payment failed. Check your payment method." },
        400,
      );
    }

    // Create the Stripe transfer to the connected account
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const params = new URLSearchParams({
      amount: String(netCents),
      currency: "usd",
      destination: recipient.stripe_connect_account_id,
      "metadata[claim_id]": claim.id,
      "metadata[work_tab_id]": workTab.id,
    });

    const transferRes = await fetch("https://api.stripe.com/v1/transfers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const transfer = await transferRes.json();
    if (!transferRes.ok) {
      return json({ error: transfer.error?.message ?? "Transfer failed" }, 500);
    }

    // Record the payout and mark the claim paid (service role bypasses RLS safely here)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await admin.from("payouts").insert({
      claim_id: claim.id,
      recipient_id: claim.user_id,
      stripe_transfer_id: transfer.id,
      amount: net,
      platform_fee: platformFee,
      status: "paid",
    });

    return json({ ok: true, transferId: transfer.id, net, platformFee });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
