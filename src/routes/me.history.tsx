import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { MeShell, SignedOutNotice } from "@/components/MeShell";
import { Badge } from "@/components/ui/badge";
import {
  fetchMyBundleRequests,
  fetchMyClaimedWork,
  formatDate,
  money,
  useAccount,
} from "@/lib/store";

export const Route = createFileRoute("/me/history")({
  head: () => ({
    meta: [
      { title: "My History — PartyTap" },
      {
        name: "description",
        content: "Everything you've accepted and confirmed on PartyTap, newest first.",
      },
      { property: "og:title", content: "My History — PartyTap" },
      { property: "og:description", content: "Your PartyTap activity in one timeline." },
    ],
  }),
  component: MyHistory,
});

type HistoryRow = {
  id: string;
  icon: typeof Briefcase;
  when: string;
  title: string;
  detail: string;
  status: string;
};

function MyHistory() {
  const account = useAccount();
  const [rows, setRows] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    if (!account) return;
    Promise.all([fetchMyClaimedWork(), fetchMyBundleRequests()]).then(([work, bundles]) => {
      const combined: HistoryRow[] = [
        ...work.map(({ tab, claim }) => ({
          id: `w-${tab.id}-${claim.id}`,
          icon: Briefcase,
          when: claim.acceptedAt,
          title: tab.title,
          detail: `Work Tab · ${money(tab.pay)}`,
          status:
            claim.status === "paid"
              ? "Paid"
              : claim.status === "submitted"
                ? "Submitted"
                : "Accepted",
        })),
        ...bundles.map(({ bundle, request }) => ({
          id: `b-${request.id}`,
          icon: Layers,
          when: request.createdAt,
          title: bundle.title,
          detail: `Bundle · ${bundle.businessA.name} + ${bundle.businessB.name}`,
          status: request.status === "scheduled" ? "Scheduled" : "Requested",
        })),
      ].sort((a, b) => b.when.localeCompare(a.when));
      setRows(combined);
    });
  }, [account]);

  if (!account) {
    return (
      <MeShell title="History">
        <SignedOutNotice next="/me/history" />
      </MeShell>
    );
  }

  if (rows === null) {
    return (
      <MeShell title="History" subtitle="Your PartyTap activity">
        <div className="card-soft p-8 text-center text-sm text-muted-foreground">Loading…</div>
      </MeShell>
    );
  }

  return (
    <MeShell title="History" subtitle="Your PartyTap activity">
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="card-soft grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent">
              <row.icon className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.detail} · {formatDate(row.when)}
              </p>
            </div>
            <Badge variant="secondary">{row.status}</Badge>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="card-soft p-8 text-center text-sm text-muted-foreground">
            Nothing here yet — accept a Work Tab or confirm a bundle to get started.
          </div>
        )}
      </div>
    </MeShell>
  );
}
