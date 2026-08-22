import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

type ForgotSearch = { email?: string | undefined };

export const Route = createFileRoute("/account/forgot")({
  validateSearch: (search: Record<string, unknown>): ForgotSearch => ({
    email: typeof search["email"] === "string" ? (search["email"] as string) : undefined,
  }),
  head: () => ({
    meta: [{ title: "Reset your PartyTap password" }],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const { email: prefill } = Route.useSearch();
  const [email, setEmail] = useState(prefill ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Enter the email address for your account.");
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
    toast.success("Check your email for a reset link");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface hero-glow px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>

        {sent ? (
          <div className="card-soft mt-6 space-y-3 p-6 text-center">
            <h1 className="text-xl font-bold text-foreground">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a password reset link to <strong>{email}</strong>. Click it to set a new
              password.
            </p>
            <p className="text-xs text-muted-foreground">
              Didn't see it? Check your{" "}
              <span className="font-medium text-primary">spam or junk folder</span>.
            </p>
            <Button asChild className="mt-2 w-full">
              <Link to="/account/auth">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form className="card-soft mt-6 space-y-4 p-6" onSubmit={submit}>
            <div>
              <h1 className="text-xl font-bold text-foreground">Reset your password</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send you a link to reset your password.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending..." : "Send reset link"}
            </Button>
            <p className="text-center text-xs font-semibold text-muted-foreground">
              <Link to="/account/auth" className="text-primary">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
