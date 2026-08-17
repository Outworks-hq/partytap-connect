import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accountSides, addContext, signIn, useAccount } from "@/lib/store";

export const Route = createFileRoute("/account/connect")({
  head: () => ({
    meta: [
      { title: "Connect your other PartyTap side" },
      {
        name: "description",
        content:
          "Add a Business or Personal side to your existing PartyTap identity — no second login needed.",
      },
      { property: "og:title", content: "Connect your other PartyTap side" },
      { property: "og:description", content: "One identity, Personal and Business contexts." },
    ],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const account = useAccount();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!account) {
    return (
      <Shell>
        <form
          className="card-soft mt-6 space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const result = signIn(identifier, password);
            if (!result.ok) return setError(result.error);
            setError(null);
          }}
        >
          <div>
            <h1 className="text-xl font-bold text-foreground">Connect your other side</h1>
            <p className="text-sm text-muted-foreground">
              Sign in first — Connect adds the missing side to the same PartyTap identity.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-id">Email / Phone</Label>
            <Input
              id="c-id"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-pass">Password</Label>
            <Input
              id="c-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Continue
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            New to PartyTap?{" "}
            <Link to="/account/signup" className="font-semibold text-primary">
              Sign Up
            </Link>
          </p>
        </form>
      </Shell>
    );
  }

  const sides = accountSides(account);
  const missing = sides.includes("business") ? "personal" : "business";
  const both = sides.length >= 2;

  return (
    <Shell>
      <div className="card-soft mt-6 space-y-4 p-6">
        <h1 className="text-xl font-bold text-foreground">
          {both ? "Both sides connected" : `Add your ${missing} account`}
        </h1>
        {both ? (
          <>
            <p className="text-sm text-muted-foreground">
              Your PartyTap identity already has Personal and Business. Use the Personal | Business
              switch in the dashboard.
            </p>
            <Button asChild className="w-full">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-border p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent">
                {missing === "business" ? (
                  <Briefcase className="h-4 w-4 text-primary" />
                ) : (
                  <UserRound className="h-4 w-4 text-primary" />
                )}
              </span>
              <p className="text-sm text-muted-foreground">
                {missing === "business"
                  ? "Create and manage Work Tabs, Bundles, requests and payments."
                  : "Receive Work Tabs, Bundles, payouts and personal activity."}{" "}
                Added under the same login ({account.email || account.phone}).
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                addContext(missing);
                toast.success(`${missing === "business" ? "Business" : "Personal"} side added`);
                navigate({ to: missing === "business" ? "/dashboard" : "/me/work" });
              }}
            >
              Connect {missing === "business" ? "Business" : "Personal"} account
            </Button>
          </>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface hero-glow px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );
}
