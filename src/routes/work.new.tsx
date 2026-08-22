import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { DollarSign, Eye, Lock, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { accountSides, getAuthedAccount, money, refreshBusinessData, uid, update, useDB, type DetailItem } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/work/new")({
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
      { title: "Create a Work Tab — PartyTap Work" },
      {
        name: "description",
        content:
          "Post a paid task: public offer, private details that unlock on accept, and a demo payout you release.",
      },
      { property: "og:title", content: "Create a Work Tab — PartyTap Work" },
      { property: "og:description", content: "Post work and pay when it's done." },
    ],
  }),
  component: CreateWorkTab,
});

function CreateWorkTab() {
  const db = useDB();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pay, setPay] = useState("100");
  const [deadline, setDeadline] = useState("");
  const [slots, setSlots] = useState("1");
  const [details, setDetails] = useState<DetailItem[]>([
    { id: uid(), label: "Instructions", value: "" },
  ]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from("work_tabs")
      .insert({
        business_id: userData.user.id,
        title,
        description,
        pay: Number(pay) || 0,
        deadline: deadline || null,
        slots: Math.max(1, Number(slots) || 1),
        details: details.filter((d) => d.value.trim()),
        payout_source: "Main Balance",
      })
      .select()
      .single();

    if (error || !data) {
      toast.error("Could not create Work Tab. Try again.");
      return;
    }

    await refreshBusinessData();
    toast.success("Work Tab created");
    navigate({ to: "/work/$id", params: { id: data.id } });
  }

  return (
    <AppShell title="Create a Work Tab" subtitle="Post work and pay when it's done.">
      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
        <Section
          step={1}
          icon={Eye}
          title="What they see"
          hint="This is the public offer."
        >
          <Field label="Task name">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder="Fix payment bug on checkout page" />
          </Field>
          <Field label="Short description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder="What needs to be done" />
          </Field>
          <Field label="Pay amount">
            <div className="relative">
              <DollarSign className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" type="number" min="0" value={pay}
                onChange={(e) => setPay(e.target.value)} required />
            </div>
          </Field>
          <Field label="Deadline">
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <Field label="How many can accept?">
            <Input type="number" min="1" value={slots} onChange={(e) => setSlots(e.target.value)} />
          </Field>
          <p className="text-xs text-muted-foreground">
            This is all they'll see before accepting.
          </p>
        </Section>

        <Section
          step={2}
          icon={Lock}
          title="Details they get"
          hint="Shown after they accept."
        >
          {details.map((d, i) => (
            <div key={d.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 border-0 px-0 text-xs font-semibold shadow-none focus-visible:ring-0"
                  value={d.label}
                  placeholder="Label"
                  onChange={(e) =>
                    setDetails((p) =>
                      p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                    )
                  }
                />
                {details.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remove detail"
                    onClick={() => setDetails((p) => p.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Textarea
                rows={2}
                value={d.value}
                placeholder="Instructions, files, access info…"
                onChange={(e) =>
                  setDetails((p) => p.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setDetails((p) => [...p, { id: uid(), label: "Detail", value: "" }])}
          >
            <Plus className="h-4 w-4" /> Add detail
          </Button>
        </Section>

        <Section step={3} icon={Wallet} title="Payout & release" hint="You decide when to pay.">
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Payout From</p>
            <p className="text-sm font-semibold text-foreground">Main Balance</p>
            <p className="text-xs text-muted-foreground">{money(db.balance)} available (demo)</p>
          </div>
          <div className="rounded-xl bg-accent p-4 text-sm text-accent-foreground">
            You'll review the work outside PartyTap. When it's good, come back and release
            payment. Payments are demo-only in this build.
          </div>
          <Button type="submit" className="w-full" size="lg">
            Create Work Tab
          </Button>
        </Section>
      </form>
    </AppShell>
  );
}

function Section({
  step,
  icon: Icon,
  title,
  hint,
  children,
}: {
  step: number;
  icon: typeof Eye;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-soft space-y-3 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {step}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Icon className="h-4 w-4 text-primary" /> {title}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="space-y-3 pt-1">{children}</div>
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
