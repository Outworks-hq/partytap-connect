import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Empty } from "./dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/bundles/")({
  head: () => ({
    meta: [
      { title: "Bundles — PartyTap" },
      {
        name: "description",
        content: "Joint offers between two businesses, shared with one bundle link.",
      },
      { property: "og:title", content: "Bundles — PartyTap" },
      { property: "og:description", content: "Joint offers between two businesses." },
    ],
  }),
  component: BundleList,
});

function BundleList() {
  const db = useDB();
  return (
    <AppShell
      title="Bundles"
      subtitle="Joint offers between two businesses"
      action={
        <Button asChild size="sm">
          <Link to="/bundles/new">
            <Plus className="h-4 w-4" /> New Bundle Tab
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {db.bundles.map((b) => (
          <Link
            key={b.id}
            to="/bundles/$id"
            params={{ id: b.id }}
            className="card-soft block p-5 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 flex-1 text-base font-bold text-foreground">{b.title}</h2>
              <Badge variant="secondary">{b.requests.length} requests</Badge>
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{b.description}</p>
            <div className="mt-4 space-y-1.5 text-sm">
              <p className="font-medium text-foreground">{b.businessA.name}</p>
              <p className="font-medium text-foreground">+ {b.businessB.name}</p>
            </div>
          </Link>
        ))}
      </div>
      {db.bundles.length === 0 && <Empty text="No Bundle Tabs yet — pair two businesses." />}
    </AppShell>
  );
}
