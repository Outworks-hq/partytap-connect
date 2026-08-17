import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, type AccountContext } from "@/lib/store";

type SignupSearch = { next?: string | undefined; email?: string | undefined };

export const Route = createFileRoute("/account/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch => ({
    next: typeof search["next"] === "string" ? (search["next"] as string) : undefined,
    email: typeof search["email"] === "string" ? (search["email"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create your PartyTap account" },
      {
        name: "description",
        content:
          "Create a Personal PartyTap account to receive Work Tabs and Bundles, or a Business account to create and manage them.",
      },
      { property: "og:title", content: "Create your PartyTap account" },
      { property: "og:description", content: "Personal or Business — one PartyTap identity." },
    ],
  }),
  component: SignupPage,
});

function code() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function SignupPage() {
  const { next, email: prefill } = Route.useSearch();
  const navigate = useNavigate();
  const [context, setContext] = useState<AccountContext | null>(null);
  const [identifier, setIdentifier] = useState(prefill ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [entered, setEntered] = useState("");

  function startVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) return setError("Enter your email or phone.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    const c = code();
    setSent(c);
    toast.info(`Verification code sent: ${c}`);
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    if (entered.trim() !== sent) {
      setError("That code doesn't match. Check the code we sent.");
      return;
    }
    const result = signUp({ identifier, password, name, context: context! });
    if (!result.ok) {
      setError(result.error);
      setSent(null);
      return;
    }
    toast.success("Your PartyTap account is ready");
    const target =
      next && next.startsWith("/") ? next : context === "business" ? "/dashboard" : "/me/work";
    navigate({ to: target });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface hero-glow px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>

        {!context && (
          <div className="card-soft mt-6 space-y-3 p-6">
            <h1 className="text-xl font-bold text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground">Choose the side you need first.</p>
            <ChoiceCard
              icon={UserRound}
              title="Personal Account"
              body="For receiving Work Tabs, Bundles, payments, and personal activity."
              onClick={() => setContext("personal")}
            />
            <ChoiceCard
              icon={Briefcase}
              title="Business Account"
              body="For creating and managing Work Tabs, Bundles, requests, payments, and business activity."
              onClick={() => setContext("business")}
            />
            <p className="text-center text-xs text-muted-foreground">
              Already have one?{" "}
              <Link to="/account/auth" className="font-semibold text-primary">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {context && !sent && (
          <form className="card-soft mt-6 space-y-4 p-6" onSubmit={startVerify}>
            <div>
              <h1 className="text-xl font-bold text-foreground capitalize">
                {context} account
              </h1>
              <button
                type="button"
                className="text-xs font-semibold text-primary"
                onClick={() => setContext(null)}
              >
                Change account type
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-name">Name</Label>
              <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-id">Email / Phone</Label>
              <Input
                id="su-id"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-pass">Password</Label>
              <Input
                id="su-pass"
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
          </form>
        )}

        {context && sent && (
          <form className="card-soft mt-6 space-y-4 p-6" onSubmit={verify}>
            <div>
              <h1 className="text-xl font-bold text-foreground">Verify {identifier}</h1>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code we sent you.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-code">Verification code</Label>
              <Input
                id="su-code"
                inputMode="numeric"
                required
                value={entered}
                onChange={(e) => setEntered(e.target.value)}
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Verify & create account
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs font-semibold text-primary"
              onClick={() => {
                const c = code();
                setSent(c);
                toast.info(`Verification code sent: ${c}`);
              }}
            >
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  body,
  onClick,
}: {
  icon: typeof UserRound;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary hover:bg-accent/40"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <span>
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{body}</span>
      </span>
    </button>
  );
}
