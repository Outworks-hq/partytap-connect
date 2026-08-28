import { useEffect } from "react";
import { Briefcase, Layers, Plus, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDB, money, formatDate, workStatus } from "@/lib/store";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { accountSides, getAuthedAccount, refreshBusinessData, verifyPendingTopups } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const account = await getAuthedAccount();
    if (!account) {
      throw redirect({ to: "/account/auth", search: { next: location.pathname } });
    }
    if (!accountSides(account).includes("business")) {
      throw redirect({ to: "/account/connect" });
    }
    await refreshBusinessData();
  },
  head: () => ({
    meta: [
      { title: "Dashboard — PartyTap" },
      {
        name: "description",
        content: "Manage your PartyTap Work Tabs, Bundle Tabs, and payouts in one place.",
      },
      { property: "og:title", content: "Dashboard — PartyTap" },
      { property: "og:description", content: "Manage Work Tabs, Bundle Tabs, and payouts." },
    ],
  }),
  component: Dashboard,
});


function Dashboard() {
  const db = useDB();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("funded") === "true") {
      // Dormant: the prepaid balance UI was removed, so no new top-ups are
      // started. Kept because prepaid accounts are planned to return as an
      // optional lower-fee tier.
      verifyPendingTopups().then((credited) => {
        if (credited > 0) refreshBusinessData();
      });
    }
  }, []);
  const openTabs = db.workTabs.filter((t) => workStatus(t) !== "Paid");
  const requests = db.bundles.flatMap((b) => b.requests);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Everything you've created and shared"
      action={
        <Button asChild size="sm">
          <Link to="/work/new">
            <Plus className="h-4 w-4" /> New Work Tab
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Briefcase} label="Active Work Tabs" value={String(openTabs.length)} />
        <Stat icon={Users} label="Bundle requests" value={String(requests.length)} />
        <Stat
          icon={Wallet}
          label="Paid out"
          value={money(
            db.workTabs
              .flatMap((t) => t.claims.filter((c) => c.status === "paid").map(() => t.pay))
              .reduce((sum, pay) => sum + pay, 0),
          )}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card-soft p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">PartyTap Work</h2>
            <Link to="/work" className="text-sm font-medium text-primary">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {db.workTabs.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                to="/work/$id"
                params={{ id: t.id }}
                className="block rounded-xl border border-border p-3.5 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {t.title}
                  </p>
                  <Badge variant="secondary">{workStatus(t)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {money(t.pay)} · due {formatDate(t.deadline)} · {t.claims.length}/{t.slots}{" "}
                  claimed
                </p>
              </Link>
            ))}
            {db.workTabs.length === 0 && <Empty text="No Work Tabs yet." />}
          </div>
        </section>

        <section className="card-soft p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Bundles</h2>
            <Link to="/bundles" className="text-sm font-medium text-primary">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {db.bundles.slice(0, 4).map((b) => (
              <Link
                key={b.id}
                to="/bundles/$id"
                params={{ id: b.id }}
                className="block rounded-xl border border-border p-3.5 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {b.title}
                  </p>
                  <Badge variant="secondary">{b.requests.length} requests</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {b.businessA.name} + {b.businessB.name}
                </p>
              </Link>
            ))}
            {db.bundles.length === 0 && <Empty text="No Bundle Tabs yet." />}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button asChild variant="outline" size="lg">
          <Link to="/work/new">
            <Briefcase className="h-4 w-4" /> Create Work Tab
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/bundles/new">
            <Layers className="h-4 w-4" /> Create Bundle Tab
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
}) {
  return (
    <div className="card-soft p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
