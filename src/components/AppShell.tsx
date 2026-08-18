import { Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Layers,
  Briefcase,
  History as HistoryIcon,
  Wallet,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Logo } from "./Logo";
import { ContextSwitch } from "./ContextSwitch";
import { AccountMenu } from "./AccountMenu";
import { useDB, money, useAccount, connectionState, hasSide } from "@/lib/store";

const businessNav = [
  { to: "/dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard },
  { to: "/work", label: "PartyTap Work", short: "Work", icon: Briefcase },
  { to: "/bundles", label: "Bundles", short: "Bundles", icon: Layers },
  { to: "/history", label: "History", short: "History", icon: HistoryIcon },
] as const;

const personalNav = [
  { to: "/me/work", label: "Work", short: "Work", icon: Briefcase },
  { to: "/me/bundles", label: "Bundles", short: "Bundles", icon: Layers },
  { to: "/me/history", label: "History", short: "History", icon: HistoryIcon },
] as const;

export function AppShell({
  title,
  subtitle,
  action,
  children,
  context = "business",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  context?: "personal" | "business";
}) {
  const db = useDB();
  const account = useAccount();
  const navigate = useNavigate();
  const personal = context === "personal";
  const nav = personal ? personalNav : businessNav;
  const connections = connectionState(account, context);

  // A single-side account never lands on the side it doesn't have.
  const wrongSide = Boolean(account) && !hasSide(account, context);
  useEffect(() => {
    if (wrongSide) navigate({ to: personal ? "/dashboard" : "/me/work", replace: true });
  }, [wrongSide, personal, navigate]);

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar p-4 lg:flex">
        <Link to="/" aria-label="PartyTap home" className="px-2 py-3">
          <Logo inverted />
        </Link>
        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        {personal ? (
          <div className="rounded-xl bg-sidebar-accent p-4 text-sidebar-foreground">
            <p className="text-xs text-sidebar-foreground/60">Personal account</p>
            <p className="mt-1 truncate text-sm font-medium">
              {account ? account.email || account.phone : "Not signed in"}
            </p>
            <p className="mt-3 text-xs text-sidebar-foreground/60">Payout Account</p>
            <Link
              to="/settings"
              className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${connections.payoutConnected ? "text-success" : "text-sidebar-foreground/80 underline"}`}
            >
              <Wallet className="h-3.5 w-3.5" />
              {connections.payoutConnected ? "Connected" : "Connect to get paid"}
            </Link>
          </div>
        ) : (
          <div className="rounded-xl bg-sidebar-accent p-4 text-sidebar-foreground">
            <p className="text-xs text-sidebar-foreground/60">Available Balance</p>
            <p className="mt-1 text-2xl font-bold">{money(db.balance)}</p>
            <p className="mt-3 text-xs text-sidebar-foreground/60">Payment Method</p>
            <Link
              to="/settings"
              className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${connections.paymentConnected ? "text-success" : "text-sidebar-foreground/80 underline"}`}
            >
              <Wallet className="h-3.5 w-3.5" />
              {connections.paymentConnected ? "Connected" : "Add a payment method"}
            </Link>
          </div>
        )}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur lg:static lg:bg-transparent lg:backdrop-blur-none">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-6 lg:py-8">
            <div className="min-w-0">
              <Link to="/" aria-label="PartyTap home" className="lg:hidden">
                <Logo />
              </Link>
              <ContextSwitch context={context} className="mt-2" />
              <h1 className="mt-2 truncate text-xl font-bold text-foreground lg:text-3xl">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <AccountMenu signInNext={personal ? "/me/work" : "/dashboard"} />
              {action}
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 sm:px-6 lg:pb-12">{children}</main>
      </div>

      <nav
        className={`fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden ${personal ? "grid-cols-3" : "grid-cols-4"}`}
      >
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary"
          >
            <item.icon className="h-5 w-5" />
            {item.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
