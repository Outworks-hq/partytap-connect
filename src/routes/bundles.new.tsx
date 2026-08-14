import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Handshake } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uid, update } from "@/lib/store";

export const Route = createFileRoute("/bundles/new")({
  head: () => ({
    meta: [
      { title: "Create a Bundle Tab — PartyTap" },
      {
        name: "description",
        content: "Pair two businesses into one combined offer and share a single booking link.",
      },
      { property: "og:title", content: "Create a Bundle Tab — PartyTap" },
      { property: "og:description", content: "Two businesses. One combined offer." },
    ],
  }),
  component: CreateBundle,
});

function CreateBundle() {
  const navigate = useNavigate();
  const [aName, setAName] = useState("");
  const [aService, setAService] = useState("");
  const [bName, setBName] = useState("");
  const [bService, setBService] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = uid();
    update((db) => ({
      ...db,
      bundles: [
        {
          id,
          title,
          description,
          businessA: { name: aName, service: aService },
          businessB: { name: bName, service: bService },
          createdAt: new Date().toISOString(),
          requests: [],
        },
        ...db.bundles,
      ],
    }));
    toast.success("Bundle Tab created");
    navigate({ to: "/bundles/$id", params: { id } });
  }

  return (
    <AppShell title="Create a Bundle Tab" subtitle="Two businesses. One combined offer.">
      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
        <Card title="Business A" icon={Building2}>
          <Field label="Business name">
            <Input value={aName} onChange={(e) => setAName(e.target.value)} required
              placeholder="GreenScape Lawn Care" />
          </Field>
          <Field label="Service they provide">
            <Input value={aService} onChange={(e) => setAService(e.target.value)} required
              placeholder="Lawn care service" />
          </Field>
        </Card>

        <Card title="Business B" icon={Building2}>
          <Field label="Business name">
            <Input value={bName} onChange={(e) => setBName(e.target.value)} required
              placeholder="ROOF ER" />
          </Field>
          <Field label="Service they provide">
            <Input value={bService} onChange={(e) => setBService(e.target.value)} required
              placeholder="Free roof inspection" />
          </Field>
        </Card>

        <Card title="Combined offer" icon={Handshake}>
          <Field label="Offer title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder="Lawn care + free roof inspection" />
          </Field>
          <Field label="What the customer gets">
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Schedule lawn care and request a free roof inspection in one step." />
          </Field>
          <p className="rounded-xl bg-accent p-3 text-xs text-accent-foreground">
            Each business stays responsible for fulfilling its own service.
          </p>
          <Button type="submit" size="lg" className="w-full">
            Create Bundle Tab
          </Button>
        </Card>
      </form>
    </AppShell>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <section className="card-soft space-y-3 p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </p>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
