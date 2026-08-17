import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, CreditCard, LogOut, Wallet, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AccountAvatar } from "@/components/AccountMenu";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  accountSides,
  connectionState,
  formatDate,
  setConnection,
  signOutAccount,
  updateProfile,
  useAccount,
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
  const context = useActiveContext();
  const navigate = useNavigate();
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [phone, setPhone] = useState(account?.phone ?? "");
  const [avatar, setAvatar] = useState(account?.avatar ?? "");

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
          {context === "business" && (
            <ConnectionRow
              icon={CreditCard}
              label="Payment method"
              hint="Required to fund paid Work Tabs you create."
              connected={conn.paymentConnected}
              onToggle={() =>
                setConnection("business", "paymentConnected", !conn.paymentConnected)
              }
            />
          )}
          <ConnectionRow
            icon={Wallet}
            label="Payout account"
            hint={
              context === "business"
                ? "Where released funds settle from."
                : "Required before you can receive payment for accepted Work Tabs."
            }
            connected={conn.payoutConnected}
            onToggle={() => setConnection(context, "payoutConnected", !conn.payoutConnected)}
          />
        </section>

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

function ConnectionRow({
  icon: Icon,
  label,
  hint,
  connected,
  onToggle,
}: {
  icon: typeof Wallet;
  label: string;
  hint: string;
  connected: boolean;
  onToggle: () => void;
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
      <Button size="sm" variant={connected ? "outline" : "default"} onClick={onToggle}>
        {connected ? "Manage" : "Connect"}
      </Button>
    </div>
  );
}
