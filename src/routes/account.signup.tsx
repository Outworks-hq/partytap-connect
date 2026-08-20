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

function SignupPage() {
  const { next, email: prefill } = Route.useSearch();
  const navigate = useNavigate();
  const [context, setContext] = useState<AccountContext | null>(null);
  const [identifier, setIdentifier] = useState(prefill ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) return setError("Enter your email or phone.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setSubmitting(true);
    const result = await signUp({ identifier, password, name, context: context! });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.newAccount === false) {
      toast.success(`Signed in — let's connect your ${context} side`);
      navigate({ to: "/account/connect" });
      return;
    }
    toast.success("Check your email to confirm your account");
    setDone(true);
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

        {context && done && (
          <div className="card-soft mt-6 space-y-3 p-6 text-center">
            <h1 className="text-xl font-bold text-foreground">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to <strong>{identifier}</strong>. Click it to activate
              your account, then sign in.
            </p>
            <Button asChild className="mt-2 w-full">
              <Link to="/account/auth" search={{ next: next ?? undefined }}>
                Go to sign in
              </Link>
            </Button>
          </div>
        )}

        {context && !done && (
          <form className="card-soft mt-6 space-y-4 p-6" onSubmit={submit}>
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </Button>
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
