import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, Phone } from "lucide-react";
import { MeShell, SignedOutNotice } from "@/components/MeShell";
import { Badge } from "@/components/ui/badge";
import { formatDate, myBundleRequests, useAccount, useDB } from "@/lib/store";

export const Route = createFileRoute("/me/bundles")({
  head: () => ({
    meta: [
      { title: "My Bundles — PartyTap" },
      {
        name: "description",
        content: "Bundle requests you confirmed: businesses, offer, date, and status.",
      },
      { property: "og:title", content: "My Bundles — PartyTap" },
      { property: "og:description", content: "Your confirmed PartyTap bundle bookings." },
    ],
  }),
  component: MyBundles,
});

function MyBundles() {
  const db = useDB();
  const account = useAccount();
  if (!account) {
    return (
      <MeShell title="My Bundles">
        <SignedOutNotice next="/me/bundles" />
      </MeShell>
    );
  }
  const rows = myBundleRequests(db, account.id);

  return (
    <MeShell title="My Bundles" subtitle="Bundle requests you confirmed">
      <div className="space-y-3">
        {rows.map(({ bundle, request }) => (
          <div key={request.id} className="card-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 text-sm font-bold text-foreground">{bundle.title}</p>
              <Badge variant={request.status === "scheduled" ? "default" : "secondary"}>
                {request.status === "scheduled" ? "Scheduled" : "Requested"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{bundle.description}</p>
            <div className="mt-3 space-y-2">
              {[bundle.businessA, bundle.businessB].map((biz) => (
                <div
                  key={biz.name}
                  className="rounded-xl border border-border p-3"
                >
                  <p className="text-sm font-semibold text-foreground">{biz.name}</p>
                  <p className="text-xs text-muted-foreground">{biz.service}</p>
                </div>
              ))}
            </div>
            <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                {formatDate(request.date)}
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-primary" /> {request.time}
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {request.address}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-primary" /> {request.phone}
              </li>
            </ul>
            {request.notes && (
              <p className="mt-2 rounded-xl bg-accent p-3 text-xs text-foreground">
                {request.notes}
              </p>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="card-soft p-8 text-center text-sm text-muted-foreground">
            You haven't confirmed any bundles yet.
          </div>
        )}
      </div>
    </MeShell>
  );
}
