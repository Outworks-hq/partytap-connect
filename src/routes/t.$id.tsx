import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Lock, Unlock, Upload, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GuestShell } from "@/components/GuestShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, money, uid, update, useDB } from "@/lib/store";

export const Route = createFileRoute("/t/$id")({
  head: () => ({
    meta: [
      { title: "Work Tab — PartyTap" },
      { name: "description", content: "View this paid task, accept it, and get paid when the admin releases payment." },
      { property: "og:title", content: "Work Tab — PartyTap" },
      { property: "og:description", content: "Accept the task. Do the work. Get paid." },
    ],
  }),
  component: GuestWorkTab,
});

const CLAIM_KEY = "partytap.claims";

function myClaims(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CLAIM_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function GuestWorkTab() {
  const { id } = Route.useParams();
  const db = useDB();
  const tab = db.workTabs.find((t) => t.id === id);
  const [claimId, setClaimId] = useState<string | null>(() => myClaims()[id] ?? null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");

  if (!tab) {
    return (
      <GuestShell>
        <div className="card-soft p-8 text-center">
          <h1 className="text-lg font-bold text-foreground">This Work Tab doesn't exist</h1>
          <p className="mt-1 text-sm text-muted-foreground">The link may have expired.</p>
        </div>
      </GuestShell>
    );
  }

  const claim = tab.claims.find((c) => c.id === claimId);
  const slotsLeft = tab.slots - tab.claims.length;

  function accept(e: React.FormEvent) {
    e.preventDefault();
    const cid = uid();
    update((db) => ({
      ...db,
      workTabs: db.workTabs.map((t) =>
        t.id !== id
          ? t
          : {
              ...t,
              claims: [
                ...t.claims,
                {
                  id: cid,
                  name,
                  contact,
                  acceptedAt: new Date().toISOString(),
                  status: "accepted" as const,
                },
              ],
            },
      ),
    }));
    const claims = myClaims();
    claims[id] = cid;
    window.localStorage.setItem(CLAIM_KEY, JSON.stringify(claims));
    setClaimId(cid);
    toast.success("Slot assigned — details unlocked");
  }

  function submitWork() {
    update((db) => ({
      ...db,
      workTabs: db.workTabs.map((t) =>
        t.id !== id
          ? t
          : {
              ...t,
              claims: t.claims.map((c) =>
                c.id === claimId
                  ? { ...c, status: "submitted" as const, note, submittedAt: new Date().toISOString() }
                  : c,
              ),
            },
      ),
    }));
    toast.success("Admin notified that the work is done");
  }

  function resetGuest() {
    const claims = myClaims();
    delete claims[id];
    window.localStorage.setItem(CLAIM_KEY, JSON.stringify(claims));
    setClaimId(null);
    setName("");
    setContact("");
    setNote("");
    toast.success("Viewing as a new guest");
  }

  return (
    <GuestShell>
      <div className="card-soft p-5 sm:p-7">
        <Badge variant="secondary">Work Tab</Badge>
        <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">{tab.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{tab.description}</p>

        <p className="mt-5 text-xs text-muted-foreground">Pay</p>
        <p className="text-4xl font-extrabold text-primary">{money(tab.pay)}</p>

        <ul className="mt-5 space-y-3 text-sm text-foreground">
          <li className="flex items-center gap-3">
            <Users className="h-4 w-4 text-primary" />
            {tab.slots} {tab.slots === 1 ? "person" : "people"} can accept
            {slotsLeft > 0 ? ` · ${slotsLeft} left` : " · full"}
          </li>
          <li className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-primary" /> Deadline {formatDate(tab.deadline)}
          </li>
          <li className="flex items-center gap-3">
            <Wallet className="h-4 w-4 text-primary" /> Get paid when the admin releases payment
          </li>
        </ul>
      </div>

      {!claim && (
        <div className="card-soft mt-4 p-5 sm:p-7">
          {slotsLeft <= 0 ? (
            <p className="text-center text-sm font-medium text-muted-foreground">
              All slots have been claimed.
            </p>
          ) : (
            <form onSubmit={accept} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact">Email or phone</Label>
                <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} required />
              </div>
              <Button type="submit" size="lg" className="w-full">
                Confirm & Accept
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> You'll see the details after you accept.
              </p>
            </form>
          )}
        </div>
      )}

      {claim && (
        <>
          <div className="card-soft mt-4 p-5 sm:p-7">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Unlock className="h-4 w-4 text-primary" /> Details unlocked
            </p>
            <ul className="mt-3 space-y-2">
              {tab.details.map((d) => (
                <li key={d.id} className="rounded-xl border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{d.label}</p>
                  <p className="text-sm text-foreground">{d.value}</p>
                </li>
              ))}
              {tab.details.length === 0 && (
                <li className="text-sm text-muted-foreground">No extra details were added.</li>
              )}
            </ul>
          </div>

          <div className="card-soft mt-4 p-5 sm:p-7">
            {claim.status === "paid" ? (
              <div className="rounded-xl bg-accent p-5 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
                <p className="mt-2 text-base font-bold text-foreground">Payment released</p>
                <p className="text-sm text-muted-foreground">You earned {money(tab.pay)} (demo).</p>
              </div>
            ) : claim.status === "submitted" ? (
              <div className="text-center">
                <Clock className="mx-auto h-7 w-7 text-primary" />
                <p className="mt-2 text-base font-bold text-foreground">Admin notified</p>
                <p className="text-sm text-muted-foreground">
                  You told the admin the work is done. PartyTap doesn't verify completion — the
                  admin releases payment when they're ready.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Upload className="h-4 w-4 text-primary" /> Mark work as done
                </p>
                <p className="text-xs text-muted-foreground">
                  Work happens outside PartyTap. Submitting only notifies the admin that you
                  finished — it isn't a verification.
                </p>
                <Textarea
                  rows={3}
                  placeholder="Add a note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button className="w-full" onClick={submitWork}>
                  Submit work as done
                </Button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={resetGuest}
            className="mx-auto mt-4 block text-xs font-medium text-muted-foreground underline underline-offset-4"
          >
            Not you? View this link as a new guest
          </button>
        </>
      )}
    </GuestShell>
  );
}
