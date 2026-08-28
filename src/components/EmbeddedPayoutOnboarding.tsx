import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function EmbeddedPayoutOnboarding({ onExit }: { onExit: () => void }) {
  const [connectInstance, setConnectInstance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchClientSecret(): Promise<string> {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not signed in.");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-account-session`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();
      if (!response.ok || !result.clientSecret) {
        throw new Error(result.error ?? "Could not start payout setup.");
      }
      return result.clientSecret;
    }

    fetchClientSecret()
      .then((secret) => {
        if (cancelled) return;
        const instance = loadConnectAndInitialize({
          publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
          fetchClientSecret: async () => secret,
        });
        setConnectInstance(instance);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!connectInstance) {
    return <p className="text-sm text-muted-foreground">Loading payout setup…</p>;
  }

  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      <ConnectAccountOnboarding onExit={onExit} />
    </ConnectComponentsProvider>
  );
}
