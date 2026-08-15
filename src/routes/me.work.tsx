import { createFileRoute, Link } from "@tanstack/react-router";
import { MeShell, SignedOutNotice } from "@/components/MeShell";
import { Badge } from "@/components/ui/badge";
import { formatDate, money, myWork, useAccount, useDB } from "@/lib/store";

export const Route = createFileRoute("/me/work")({
  head: () => ({
    meta: [
      { title: "My Work — PartyTap" },
      {
        name: "description",
        content: "Work Tabs you accepted: unlocked details, submission status, and payouts.",
      },
      { property: "og:title", content: "My Work — PartyTap" },
      { property: "og:description", content: "Track the Work Tabs you accepted." },
    ],
  }),
  component: MyWork,
});

const label = { accepted: "Accepted", submitted: "Submitted", paid: "Paid" } as const;

function MyWork() {
  const db = useDB();
  const account = useAccount();
  if (!account) {
    return (
      <MeShell title="My Work">
        <SignedOutNotice next="/me/work" />
      </MeShell>
    );
  }
  const rows = myWork(db, account.id);

  return (
    <MeShell title="My Work" subtitle="Work Tabs you accepted">
      <div className="space-y-3">
        {rows.map(({ tab, claim }) => (
          <Link
            key={tab.id}
            to="/t/$id"
            params={{ id: tab.id }}
            className="card-soft block p-4 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 text-sm font-bold text-foreground">{tab.title}</p>
              <Badge variant={claim.status === "paid" ? "default" : "secondary"}>
                {label[claim.status]}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tab.description}</p>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-xl font-extrabold text-primary">{money(tab.pay)}</p>
              <p className="text-xs text-muted-foreground">
                Due {formatDate(tab.deadline)} · accepted {formatDate(claim.acceptedAt)}
              </p>
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <div className="card-soft p-8 text-center text-sm text-muted-foreground">
            You haven't accepted any Work Tabs yet.
          </div>
        )}
      </div>
    </MeShell>
  );
}
