import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startSaveCard } from "@/lib/store";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CardFields({ onSaved }: { onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    const { error } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message ?? "Could not save card.");
      return;
    }

    toast.success("Card saved");
    onSaved();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={!stripe || submitting}>
        {submitting ? "Saving…" : "Save card"}
      </Button>
    </form>
  );
}

export function AddCardForm({ onSaved }: { onSaved: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startSaveCard().then((result) => {
      if (result.ok) setClientSecret(result.clientSecret);
      else setError(result.error);
    });
  }, []);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!clientSecret) {
    return <p className="text-sm text-muted-foreground">Loading card form…</p>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardFields onSaved={onSaved} />
    </Elements>
  );
}
