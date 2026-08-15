import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticate } from "@/lib/store";

type AuthSearch = { next?: string; email?: string };

export const Route = createFileRoute("/account/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    next: typeof search['next'] === "string" ? (search['next'] as string) : undefined,
    email: typeof search['email'] === "string" ? (search['email'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your PartyTap account" },
      {
        name: "description",
        content:
          "Create or sign in to your PartyTap account to accept Work Tabs and confirm bundles.",
      },
      { property: "og:title", content: "Your PartyTap account" },
      { property: "og:description", content: "One account for Work Tabs and Bundles." },
    ],
  }),
  component: AccountAuth,
});

function AccountAuth() {
  const { next, email: prefill } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(prefill ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = authenticate(email, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("You're signed in to PartyTap");
    const target = next && next.startsWith("/") ? next : "/me/work";
    navigate({ to: target });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface hero-glow px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <form className="card-soft mt-6 space-y-4 p-6" onSubmit={submit}>
          <div>
            <h1 className="text-xl font-bold text-foreground">Your PartyTap account</h1>
            <p className="text-sm text-muted-foreground">
              One account for Work Tabs and Bundles. New here? Enter an email and password to
              create it instantly.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acct-email">Email</Label>
            <Input
              id="acct-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acct-password">Password</Label>
            <Input
              id="acct-password"
              type="password"
              required
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Continue
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demo accounts are stored on this device only.
          </p>
        </form>
      </div>
    </div>
  );
}
