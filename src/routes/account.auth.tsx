import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accountSides, authenticate, signIn } from "@/lib/store";

type AuthSearch = {
  next?: string | undefined;
  email?: string | undefined;
  recipient?: boolean | undefined;
};

export const Route = createFileRoute("/account/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    next: typeof search['next'] === "string" ? (search['next'] as string) : undefined,
    email: typeof search['email'] === "string" ? (search['email'] as string) : undefined,
    recipient:
      search['recipient'] === true || search['recipient'] === "true" || search['recipient'] === "1"
        ? true
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in to PartyTap" },
      {
        name: "description",
        content:
          "Sign in to your PartyTap account with email or phone to manage Work Tabs, Bundles, and payments.",
      },
      { property: "og:title", content: "Sign in to PartyTap" },
      { property: "og:description", content: "One account for Work Tabs and Bundles." },
    ],
  }),
  component: AccountAuth,
});

function AccountAuth() {
  const { next, email: prefill, recipient } = Route.useSearch();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState(prefill ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Recipients of a shared Work Tab / Bundle link get a Personal account created
    // automatically — everyone else must already have a PartyTap account.
    const result = recipient ? authenticate(identifier, password) : signIn(identifier, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("You're signed in to PartyTap");
    const fallback = accountSides(result.account)[0] === "business" ? "/dashboard" : "/me/work";
    navigate({ to: next && next.startsWith("/") ? next : fallback });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface hero-glow px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <form className="card-soft mt-6 space-y-4 p-6" onSubmit={submit}>
          <div>
            <h1 className="text-xl font-bold text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              {recipient
                ? "Sign in or create your PartyTap account to continue this tab."
                : "One PartyTap account for your personal and business sides."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acct-id">Email / Phone</Label>
            <Input
              id="acct-id"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acct-password">Password</Label>
            <Input
              id="acct-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Continue
          </Button>
          <p className="text-center text-xs font-semibold text-muted-foreground">
            <Link
              to="/account/signup"
              search={{
                ...(next ? { next } : {}),
                ...(identifier.includes("@") ? { email: identifier } : {}),
              }}
              className="text-primary"
            >
              Sign Up
            </Link>
            <span className="px-2 text-muted-foreground">·</span>
            <Link to="/account/connect" className="text-primary">
              Connect
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
