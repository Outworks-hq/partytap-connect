import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/account/reset")({
  head: () => ({
    meta: [{ title: "Set a new PartyTap password" }],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      } else {
        setInvalid(true);
      }
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/account/auth" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface hero-glow px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>

        {invalid && (
          <div className="card-soft mt-6 space-y-3 p-6 text-center">
            <h1 className="text-xl font-bold text-foreground">Link expired</h1>
            <p className="text-sm text-muted-foreground">
              This reset link is no longer valid. Request a new one to continue.
            </p>
            <Button asChild className="mt-2 w-full">
              <Link to="/account/forgot">Request a new link</Link>
            </Button>
          </div>
        )}

        {ready && (
          <form className="card-soft mt-6 space-y-4 p-6" onSubmit={submit}>
            <div>
              <h1 className="text-xl font-bold text-foreground">Set a new password</h1>
              <p className="text-sm text-muted-foreground">
                Choose a new password for your PartyTap account.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-pass">New password</Label>
              <Input
                id="reset-pass"
                type="password"
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Confirm password</Label>
              <Input
                id="reset-confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Updating..." : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
