import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Empty } from "./dashboard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, money, useDB, workStatus } from "@/lib/store";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — PartyTap" },
      {
        name: "description",
        content: "Status and history for every Work Tab payout and Bundle Tab request.",
      },
      { property: "og:title", content: "History — PartyTap" },
      { property: "og:description", content: "Payout and booking history across PartyTap." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const db = useDB();
  const bundleRows = db.bundles.flatMap((b) =>
    b.requests.map((r) => ({ bundle: b, request: r })),
  );

  return (
    <AppShell title="History" subtitle="Everything that has happened across your tabs">
      <Tabs defaultValue="work">
        <TabsList>
          <TabsTrigger value="work">Work Tabs</TabsTrigger>
          <TabsTrigger value="bundles">Bundle requests</TabsTrigger>
        </TabsList>

        <TabsContent value="work" className="mt-4 space-y-3">
          {db.workTabs.map((t) => (
            <Link
              key={t.id}
              to="/work/$id"
              params={{ id: t.id }}
              className="card-soft grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {money(t.pay)} · created {formatDate(t.createdAt)} · {t.claims.length}/{t.slots}{" "}
                  claimed
                </p>
              </div>
              <Badge variant={workStatus(t) === "Paid" ? "default" : "secondary"}>
                {workStatus(t)}
              </Badge>
            </Link>
          ))}
          {db.workTabs.length === 0 && <Empty text="No Work Tab history yet." />}
        </TabsContent>

        <TabsContent value="bundles" className="mt-4 space-y-3">
          {bundleRows.map(({ bundle, request }) => (
            <Link
              key={request.id}
              to="/bundles/$id"
              params={{ id: bundle.id }}
              className="card-soft grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {request.name} · {bundle.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(request.date)} {request.time} · {bundle.businessA.name} +{" "}
                  {bundle.businessB.name}
                </p>
              </div>
              <Badge variant={request.status === "scheduled" ? "default" : "secondary"}>
                {request.status === "scheduled" ? "Scheduled" : "New"}
              </Badge>
            </Link>
          ))}
          {bundleRows.length === 0 && <Empty text="No bundle requests yet." />}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
