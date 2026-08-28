import { AddCardForm } from "@/components/AddCardForm";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, CreditCard, KeyRound, LogOut, Wallet, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AccountAvatar } from "@/components/AccountMenu";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmbeddedPayoutOnboarding } from "@/components/EmbeddedPayoutOnboarding";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import {
  accountSides,
  connectionState,
  formatDate,
  money, 
  setConnection,
  signOutAccount,
  refreshStripeConnectStatus,
  fetchSavedCards,
  type SavedCard,
  updateProfile,
  useAccount,
  useDB,
  useActiveContext,
} from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PartyTap" },
      {
        name: "description",
        content:
          "Your PartyTap profile, account details, payment method and payout account status.",
      },
      { property: "og:title", content: "Settings — PartyTap" },
      { property: "og:description", content: "Profile, account details and payment status." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const account = useAccount();
  const [showPayoutOnboarding, setShowPayoutOnboarding] = useState(false);  
  const context = useActiveContext();
  const navigate = useNavigate();
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [phone, setPhone] = useState(account?.phone ?? "");
  const [avatar, setAvatar] = useState(account?.avatar ?? "");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      refreshStripeConnectStatus();
    }
  }, []);

  if (!account) {
    return (
      <AppShell title="Settings" context={context}>
        <div className="card-soft p-8 text-center">
          <p className="text-base font-bold text-foreground">Sign in to manage your account</p>
          <Button asChild className="mt-4">
            <Link to="/account/auth" search={{ next: "/settings" }}>
              Sign in
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const sides = accountSides(account);
  const conn = connectionState(account, context);

  return (
    <AppShell title="Settings" subtitle="Your PartyTap account" context={context}>
      <div className="grid max-w-3xl gap-4">
        <section className="card-soft space-y-4 p-5">
          <div className="flex items-center gap-3">
            <AccountAvatar account={{ ...account, avatar }} className="h-14 w-14" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">
                {name || account.email || account.phone}
              </p>
              <p className="text-xs text-muted-foreground">
                Member since {formatDate(account.createdAt)}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s-name">Name</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-avatar">Profile photo URL</Label>
              <Input
                id="s-avatar"
                value={avatar}
                placeholder="https://…"
                onChange={(e) => setAvatar(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-email">Email</Label>
              <Input
                id="s-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-phone">Phone</Label>
              <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <Button
            onClick={() => {
              updateProfile({
                name,
                email: email.trim().toLowerCase(),
                phone: phone.trim().toLowerCase(),
                avatar,
              });
              toast.success("Profile updated");
            }}
          >
            Save profile
          </Button>
        </section>

        <section className="card-soft space-y-3 p-5">
          <h2 className="text-sm font-bold text-foreground">Account details</h2>
          <div className="flex flex-wrap gap-2">
            {sides.map((s) => (
              <Badge key={s} variant="secondary" className="capitalize">
                {s} account
              </Badge>
            ))}
          </div>
          {sides.length < 2 && (
            <Button asChild variant="outline" size="sm">
              <Link to="/account/connect">
                Connect a {sides[0] === "personal" ? "Business" : "Personal"} account
              </Link>
            </Button>
          )}
        </section>

        <section className="card-soft space-y-3 p-5">
          <h2 className="text-sm font-bold text-foreground">
            {context === "business" ? "Business payments" : "Personal payouts"}
          </h2>
          {context === "business" && <PaymentMethodSection />}
          <ConnectionRow
            icon={Wallet}
            label="Payout account"
            hint={
              context === "business"
                ? "Where released funds settle from."
                : "Required before you can receive payment for accepted Work Tabs."
            }
            connected={conn.payoutConnected}
            onToggle={() => setShowPayoutOnboarding((open) => !open)}
          />
          {showPayoutOnboarding && (
            <div className="rounded-xl border border-border p-3.5">
              <EmbeddedPayoutOnboarding
                onExit={async () => {
                  setShowPayoutOnboarding(false);
                  await refreshStripeConnectStatus();
                  toast.success("Payout setup updated");
                }}
              />
            </div>
          )}
        </section>

        <ChangePasswordSection />
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => {
            signOutAccount();
            navigate({ to: "/" });
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </AppShell>
  );
}

function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    setOpen(false);
    setPassword("");
    setConfirm("");
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-fit" onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4" /> Change password
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="card-soft space-y-3 p-4">
      <p className="text-sm font-bold text-foreground">Change password</p>
      <div className="space-y-2">
        <Label htmlFor="new-pass">New password</Label>
        <Input
          id="new-pass"
          type="password"
          required
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-pass">Confirm password</Label>
        <Input
          id="confirm-pass"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Updating..." : "Update password"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PaymentMethodSection() {
  const [cards, setCards] = useState<SavedCard[] | null>(null);
  const [adding, setAdding] = useState(false);

  function load() {
    fetchSavedCards().then(setCards);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-xl border border-border p-3.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent">
          <CreditCard className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Payment method</p>
          <p className="text-xs text-muted-foreground">
            Used to pay for Work Tabs when you release payment.
          </p>
        </div>
      </div>

      {cards === null && (
        <p className="mt-3 text-xs text-muted-foreground">Loading…</p>
      )}

      {cards && cards.length > 0 && (
        <ul className="mt-3 space-y-2">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex items-center justify-between rounded-xl border border-border p-3"
            >
              <span className="text-sm font-medium text-foreground capitalize">
                {card.brand} •••• {card.last4}
              </span>
              <span className="text-xs text-muted-foreground">
                {card.expMonth}/{card.expYear}
              </span>
            </li>
          ))}
        </ul>
      )}

      {cards && cards.length === 0 && !adding && (
        <p className="mt-3 text-xs text-muted-foreground">No card on file yet.</p>
      )}

      {adding ? (
        <div className="mt-3">
          <AddCardForm
            onSaved={() => {
              setAdding(false);
              load();
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => setAdding(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button size="sm" className="mt-3" onClick={() => setAdding(true)}>
          {cards && cards.length > 0 ? "Add another card" : "Add a card"}
        </Button>
      )}
    </div>
  );
}

function ConnectionRow({
  icon: Icon,
  label,
  hint,
  connected,
  onToggle,
  busy = false,
}: {
  icon: typeof Wallet;
  label: string;
  hint: string;
  connected: boolean;
  onToggle: () => void;
  busy?: boolean;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border p-3.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
        <p
          className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${connected ? "text-success" : "text-muted-foreground"}`}
        >
          {connected ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          {connected ? "Connected" : "Not connected"}
        </p>
      </div>
      <Button
        size="sm"
        variant={connected ? "outline" : "default"}
        onClick={onToggle}
        disabled={busy}
      >
        {busy ? "Opening…" : connected ? "Manage" : "Connect"}
      </Button>
    </div>
  );
}
