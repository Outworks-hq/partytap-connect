import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalendarDays, MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CopyLink } from "@/components/CopyLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { accountSides, formatDate, getAuthedAccount, refreshBusinessData, update, useDB } from "@/lib/store";

export const Route = createFileRoute("/bundles/$id")({
  beforeLoad: async ({ location }) => {
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
      { title: "Bundle Tab — PartyTap" },
      { name: "description", content: "Share your bundle link and track incoming booking requests." },
      { property: "og:title", content: "Bundle Tab — PartyTap" },
      { property: "og:description", content: "Share your bundle link and track requests." },
    ],
  }),
  component: BundleDetail,
});

function BundleDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const bundle = db.bundles.find((b) => b.id === id);

  if (!bundle) {
    return (
      <AppShell title="Bundle Tab not found">
        <Button asChild variant="outline">
          <Link to="/bundles">Back to Bundles</Link>
        </Button>
      </AppShell>
    );
  }

  function schedule(reqId: string) {
    update((db) => ({
      ...db,
      bundles: db.bundles.map((b) =>
        b.id !== id
          ? b
          : {
              ...b,
              requests: b.requests.map((r) =>
                r.id === reqId ? { ...r, status: "scheduled" as const } : r,
              ),
            },
      ),
    }));
    toast.success("Marked as scheduled");
  }

  return (
    <AppShell
      title={bundle.title}
      subtitle={`${bundle.businessA.name} + ${bundle.businessB.name}`}
      action={<Badge variant="secondary">{bundle.requests.length} requests</Badge>}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-soft space-y-4 p-5">
          <div>
            <h2 className="text-sm font-bold text-foreground">Combined offer</h2>
            <p className="mt-1 text-sm text-muted-foreground">{bundle.description}</p>
          </div>
          <div className="space-y-2">
            {[bundle.businessA, bundle.businessB].map((biz) => (
              <div key={biz.name} className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold text-foreground">{biz.name}</p>
                <p className="text-xs text-muted-foreground">{biz.service}</p>
              </div>
            ))}
          </div>
          <CopyLink path={`/b/${bundle.id}`} label="Your bundle link" />
        </section>

        <section className="space-y-3 lg:col-span-2">
          <h2 className="text-sm font-bold text-foreground">Booking requests</h2>
          {bundle.requests.length === 0 && (
            <p className="card-soft p-8 text-center text-sm text-muted-foreground">
              No requests yet. Share the bundle link with customers.
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {bundle.requests.map((r) => (
              <div key={r.id} className="card-soft p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-bold text-foreground">{r.name}</p>
                  <Badge variant={r.status === "scheduled" ? "default" : "secondary"}>
                    {r.status === "scheduled" ? "Scheduled" : "New"}
                  </Badge>
                </div>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" /> {r.phone}
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {r.address}
                  </li>
                  <li className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" /> {formatDate(r.date)}
                    {r.time ? ` at ${r.time}` : ""}
                  </li>
                  {r.notes && (
                    <li className="flex items-start gap-2">
                      <User className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {r.notes}
                    </li>
                  )}
                </ul>
                {r.status === "new" && (
                  <Button size="sm" variant="secondary" className="mt-3 w-full"
                    onClick={() => schedule(r.id)}>
                    Mark scheduled
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
