import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function verifyStripeSignature(body: string, signature: string, secret: string) {
  const parts = Object.fromEntries(
    signature.split(",").map((p) => p.split("=") as [string, string]),
  );
  const timestamp = parts["t"];
  const expectedSig = parts["v1"];
  if (!timestamp || !expectedSig) return false;

  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === expectedSig;
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  // Two destinations (v1 + v2 events) means two possible signing secrets.
  const secrets = [
    Deno.env.get("STRIPE_WEBHOOK_SECRET"),
    Deno.env.get("STRIPE_WEBHOOK_SECRET_V1"),
  ].filter(Boolean) as string[];

  if (!signature || secrets.length === 0) {
    return new Response("Missing signature or secret", { status: 400 });
  }

  let valid = false;
  for (const secret of secrets) {
    if (await verifyStripeSignature(body, signature, secret)) {
      valid = true;
      break;
    }
  }

  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);

  try {
    const accountEventTypes = [
      "v2.core.account.updated",
      "v2.core.account[configuration.recipient].updated",
      "v2.core.account[configuration.recipient].capability_status_updated",
    ];

    // Balance top-up completed via Checkout
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;
      const userId = session?.metadata?.user_id;
      const purpose = session?.metadata?.purpose;
      const amountTotal = Number(session?.amount_total ?? 0) / 100;

      console.log("WEBHOOK topup:", userId, purpose, amountTotal);

      if (userId && purpose === "balance_topup" && amountTotal > 0) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("balance")
          .eq("id", userId)
          .single();

        const newBalance = Number(profile?.balance ?? 0) + amountTotal;

        await supabaseAdmin
          .from("profiles")
          .update({ balance: newBalance })
          .eq("id", userId);

        console.log("WEBHOOK balance credited:", userId, newBalance);
      }
    }

    if (accountEventTypes.includes(event.type)) {
      // Thin payloads only reference the object — fetch the full account from Stripe.
      const accountId = event.related_object?.id ?? event.data?.id;
      if (accountId) {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
        const accRes = await fetch(
          `https://api.stripe.com/v2/core/accounts/${accountId}?include=configuration.recipient`,
          {
            headers: {
              Authorization: `Bearer ${stripeKey}`,
              "Stripe-Version": "2026-07-29.preview",
            },
          },
        );

        const account = await accRes.json();
        console.log("WEBHOOK account fetch:", accRes.status, JSON.stringify(account));

        const transfersStatus =
          account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
        const onboarded = transfersStatus === "active";

        await supabaseAdmin
          .from("profiles")
          .update({ stripe_connect_onboarded: onboarded })
          .eq("stripe_connect_account_id", accountId);

        console.log("WEBHOOK updated onboarded:", accountId, onboarded);
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});
