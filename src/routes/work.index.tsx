import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Empty } from "./dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { accountSides, getAuthedAccount, useDB, money, formatDate, workStatus } from "@/lib/store";

export const Route = createFileRoute("/work/")({
  beforeLoad: async ({ location }) => {
    const account = await getAuthedAccount();
    if (!account) {
      throw redirect({ to: "/account/auth", search: { next: location.pathname } });
    }
    if (!accountSides(account).includes("business")) {
      throw redirect({ to: "/account/connect" });
    }
  },
  head: () => ({
    meta: [
      { title: "PartyTap Work — Work Tabs" },
      {
        name: "description",
        content: "Every Work Tab you've created: pay, deadline, claims and demo payout state.",
      },
      { property: "og:title", content: "PartyTap Work — Work Tabs" },
      { property: "og:description", content: "Every paid Work Tab you've created." },
    ],
  }),
  component: WorkList,
});

function WorkList() {
  const db = useDB();
  return (
    <AppShell
      title="PartyTap Work"
      subtitle="Paid tasks you post, share and release"
      action={
        <Button asChild size="sm">
          <Link to="/work/new">
            <Plus className="h-4 w-4" /> New Work Tab
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {db.workTabs.map((t) => (
          <Link
            key={t.id}
            to="/work/$id"
            params={{ id: t.id }}
            className="card-soft block p-5 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 flex-1 text-base font-bold text-foreground">{t.title}</h2>
              <Badge variant="secondary">{workStatus(t)}</Badge>
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-2xl font-extrabold text-primary">{money(t.pay)}</p>
              <div className="text-right text-xs text-muted-foreground">
                <p>Due {formatDate(t.deadline)}</p>
                <p>
                  {t.claims.length}/{t.slots} claimed
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {db.workTabs.length === 0 && (
        <Empty text="No Work Tabs yet — create your first paid task." />
      )}
    </AppShell>
  );
}
