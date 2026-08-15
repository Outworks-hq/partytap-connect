import { Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, History as HistoryIcon, Layers, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { signOutAccount, useAccount } from "@/lib/store";

const tabs = [
  { to: "/me/work", label: "My Work", icon: Briefcase },
  { to: "/me/bundles", label: "My Bundles", icon: Layers },
  { to: "/me/history", label: "History", icon: HistoryIcon },
] as const;

export function MeShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const account = useAccount();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5">
          <Link to="/" aria-label="PartyTap home">
            <Logo />
          </Link>
          {account ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                signOutAccount();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/account/auth" search={{ next: "/me/work" }}>
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 pb-16">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">My PartyTap</p>
        <h1 className="mt-1 text-2xl font-extrabold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        {account && (
          <p className="mt-1 text-xs text-muted-foreground">Signed in as {account.email}</p>
        )}

        <nav className="mt-5 grid grid-cols-3 gap-2">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground sm:text-sm"
            >
              <t.icon className="h-4 w-4 shrink-0" />
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function SignedOutNotice({ next }: { next: string }) {
  return (
    <div className="card-soft p-8 text-center">
      <p className="text-base font-bold text-foreground">Sign in to see this</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Your accepted Work Tabs and bundle requests live in your PartyTap account.
      </p>
      <Button asChild className="mt-4">
        <Link to="/account/auth" search={{ next }}>
          Sign in or create an account
        </Link>
      </Button>
    </div>
  );
}
