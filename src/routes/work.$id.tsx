import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CheckCircle2, Clock, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CopyLink } from "@/components/CopyLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { accountSides, formatDate, getAuthedAccount, money, refreshBusinessData, releaseWorkTabPayment, useDB, workStatus } from "@/lib/store";

export const Route = createFileRoute("/work/$id")({
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
      { title: "Work Tab — PartyTap Work" },
      { name: "description", content: "Manage this Work Tab: claims, submissions and payout release." },
      { property: "og:title", content: "Work Tab — PartyTap Work" },
      { property: "og:description", content: "Manage claims, submissions and payout release." },
    ],
  }),
  component: WorkDetail,
});

function WorkDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const tab = db.workTabs.find((t) => t.id === id);

  if (!tab) {
    return (
      <AppShell title="Work Tab not found">
        <Button asChild variant="outline">
          <Link to="/work">Back to PartyTap Work</Link>
        </Button>
      </AppShell>
    );
  }

  async function release(claimId: string) {
    const result = await releaseWorkTabPayment(claimId, tab?.pay ?? 0);
    if (!result.ok) {
      toast.error("Could not release payment. Try again.");
      return;
    }
    await refreshBusinessData();
    toast.success("Payment released");
  }

  return (
    <AppShell
      title={tab.title}
      subtitle={`${money(tab.pay)} · due ${formatDate(tab.deadline)}`}
      action={<Badge variant="secondary">{workStatus(tab)}</Badge>}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-soft space-y-4 p-5 lg:col-span-2">
          <div>
            <h2 className="text-sm font-bold text-foreground">Public offer</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tab.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Pill icon={Users} text={`${tab.claims.length}/${tab.slots} claimed`} />
              <Pill icon={Clock} text={`Due ${formatDate(tab.deadline)}`} />
            </div>
          </div>
          <CopyLink path={`/t/${tab.id}`} label="Your Work Tab link" />

          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Lock className="h-4 w-4 text-primary" /> Accepted details
            </h2>
            <p className="text-xs text-muted-foreground">
              Hidden from guests until they accept.
            </p>
            <ul className="mt-3 space-y-2">
              {tab.details.map((d) => (
                <li key={d.id} className="rounded-xl border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{d.label}</p>
                  <p className="text-sm text-foreground">{d.value}</p>
                </li>
              ))}
              {tab.details.length === 0 && (
                <li className="text-sm text-muted-foreground">No private details added.</li>
              )}
            </ul>
          </div>
        </section>

        <section className="card-soft space-y-3 p-5">
          <h2 className="text-sm font-bold text-foreground">Claims & payout</h2>
          {tab.claims.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No one has accepted yet. Share the link above.
            </p>
          )}
          {tab.claims.map((c) => (
            <div key={c.id} className="rounded-xl border border-border p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-foreground">{c.name}</p>
                <Badge variant={c.status === "paid" ? "default" : "secondary"}>
                  {c.status === "paid"
                    ? "Paid"
                    : c.status === "submitted"
                      ? "Submitted"
                      : "Accepted"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{c.contact}</p>
              {c.note && <p className="mt-2 text-sm text-foreground">“{c.note}”</p>}
              {c.status === "paid" ? (
                <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" /> {money(tab.pay)} released
                </p>
              ) : (
                <Button className="mt-3 w-full" size="sm" onClick={() => release(c.id)}>
                  Release payment ({money(tab.pay)})
                </Button>
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Work is completed and reviewed outside PartyTap.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function Pill({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">
      <Icon className="h-3.5 w-3.5" /> {text}
    </span>
  );
}
