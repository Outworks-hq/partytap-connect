import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Clock, MapPin, Phone, User } from "lucide-react";
import { useState } from "react";
import { GuestShell } from "@/components/GuestShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, uid, update, useDB } from "@/lib/store";

export const Route = createFileRoute("/b/$id")({
  head: () => ({
    meta: [
      { title: "Bundle booking — PartyTap" },
      {
        name: "description",
        content: "Book a combined offer from two businesses in one step.",
      },
      { property: "og:title", content: "Bundle booking — PartyTap" },
      { property: "og:description", content: "Two businesses, one booking." },
    ],
  }),
  component: GuestBundle,
});

function GuestBundle() {
  const { id } = Route.useParams();
  const db = useDB();
  const bundle = db.bundles.find((b) => b.id === id);
  const [done, setDone] = useState<null | { name: string; date: string; time: string }>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    date: "",
    time: "",
    notes: "",
  });

  if (!bundle) {
    return (
      <GuestShell>
        <div className="card-soft p-8 text-center">
          <h1 className="text-lg font-bold text-foreground">This bundle doesn't exist</h1>
          <p className="mt-1 text-sm text-muted-foreground">The link may have expired.</p>
        </div>
      </GuestShell>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    update((db) => ({
      ...db,
      bundles: db.bundles.map((b) =>
        b.id !== id
          ? b
          : {
              ...b,
              requests: [
                {
                  id: uid(),
                  ...form,
                  createdAt: new Date().toISOString(),
                  status: "new" as const,
                },
                ...b.requests,
              ],
            },
      ),
    }));
    setDone({ name: form.name, date: form.date, time: form.time });
  }

  if (done) {
    return (
      <GuestShell>
        <div className="card-soft p-7 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h1 className="mt-3 text-xl font-extrabold text-foreground">Bundle confirmed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Thanks {done.name} — both businesses have your request for{" "}
            {formatDate(done.date)} {done.time}.
          </p>
          <div className="mt-5 space-y-2 text-left">
            {[bundle.businessA, bundle.businessB].map((biz) => (
              <div key={biz.name} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{biz.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{biz.service}</p>
                </div>
                <Badge variant="secondary">Requested</Badge>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Each business will follow up directly.
          </p>
        </div>
      </GuestShell>
    );
  }

  return (
    <GuestShell>
      <div className="card-soft overflow-hidden">
        <div className="bg-accent p-5">
          <Badge variant="secondary">Bundle Tab</Badge>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground">{bundle.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground">
              {bundle.businessA.name}
            </span>
            <span className="text-xs font-bold text-muted-foreground">+</span>
            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground">
              {bundle.businessB.name}
            </span>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground">{bundle.description}</p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <IconField icon={User}>
              <Input placeholder="Full name" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </IconField>
            <IconField icon={Phone}>
              <Input placeholder="Phone number" required value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </IconField>
            <IconField icon={MapPin}>
              <Input placeholder="Property address" required value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </IconField>
            <div className="grid grid-cols-2 gap-3">
              <IconField icon={CalendarDays}>
                <Input type="date" required value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </IconField>
              <IconField icon={Clock}>
                <Input type="time" required value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </IconField>
            </div>
            <Textarea rows={2} placeholder="Notes (optional)" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />

            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground">Bundle summary</p>
              {[bundle.businessA, bundle.businessB].map((biz) => (
                <div key={biz.name} className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{biz.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{biz.service}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                </div>
              ))}
            </div>

            <Button type="submit" size="lg" className="w-full">
              Confirm bundle
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Each business fulfils its own service.
            </p>
          </form>
        </div>
      </div>
    </GuestShell>
  );
}

function IconField({
  icon: Icon,
  children,
}: {
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-2.5 left-3 z-10 h-4 w-4 text-muted-foreground" />
      <div className="[&_input]:pl-9">{children}</div>
    </div>
  );
}
