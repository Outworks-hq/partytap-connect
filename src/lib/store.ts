import { useSyncExternalStore } from "react";

export type DetailItem = { id: string; label: string; value: string };

export type Account = {
  id: string;
  email: string;
  password: string;
  createdAt: string;
};

export type Claim = {
  id: string;
  userId?: string;
  name: string;
  contact: string;
  acceptedAt: string;
  submittedAt?: string;
  note?: string;
  status: "accepted" | "submitted" | "paid";
};

export type WorkTab = {
  id: string;
  title: string;
  description: string;
  pay: number;
  deadline: string;
  slots: number;
  details: DetailItem[];
  payoutSource: string;
  createdAt: string;
  claims: Claim[];
};

export type BundleRequest = {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  address: string;
  date: string;
  time: string;
  notes?: string;
  createdAt: string;
  status: "new" | "scheduled";
};

export type Business = { name: string; service: string };

export type BundleTab = {
  id: string;
  title: string;
  description: string;
  businessA: Business;
  businessB: Business;
  createdAt: string;
  requests: BundleRequest[];
};

export type DB = {
  balance: number;
  payoutConnected: boolean;
  signedIn: boolean;
  accounts: Account[];
  currentAccountId: string | null;
  workTabs: WorkTab[];
  bundles: BundleTab[];
};

const KEY = "partytap.v1";

const seed: DB = {
  balance: 250,
  payoutConnected: true,
  signedIn: false,
  accounts: [],
  currentAccountId: null,
  workTabs: [
    {
      id: "abc123",
      title: "Fix payment bug on checkout page",
      description: "Checkout throws an error on the final step for some users.",
      pay: 100,
      deadline: "2026-08-28",
      slots: 1,
      details: [
        { id: "d1", label: "Where to look", value: "Bug is in the /pay route on line 87" },
        { id: "d2", label: "Access", value: "GitHub Access: aleet-dev" },
        { id: "d3", label: "Files", value: "Design file & screenshot attached" },
      ],
      payoutSource: "Main Balance",
      createdAt: "2026-08-10T10:00:00.000Z",
      claims: [],
    },
  ],
  bundles: [
    {
      id: "greenscape",
      title: "Lawn care + free roof inspection",
      description:
        "Schedule lawn care and request a free roof inspection in one step.",
      businessA: { name: "GreenScape Lawn Care", service: "Lawn care service" },
      businessB: { name: "ROOF ER", service: "Free roof inspection" },
      createdAt: "2026-08-09T10:00:00.000Z",
      requests: [],
    },
  ],
};

let cache: DB | null = null;
const listeners = new Set<() => void>();

function read(): DB {
  if (cache) return cache;
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? ({ ...seed, ...(JSON.parse(raw) as Partial<DB>) } as DB) : seed;
  } catch {
    cache = seed;
  }
  return cache!;
}

function write(next: DB) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function update(fn: (db: DB) => DB) {
  write(fn(read()));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, read, () => seed);
}

export function uid(len = 6) {
  return Math.random().toString(36).slice(2, 2 + len);
}

export function money(n: number) {
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

export function formatDate(d: string) {
  if (!d) return "No deadline";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function workStatus(t: WorkTab) {
  if (t.claims.length > 0 && t.claims.every((c) => c.status === "paid")) return "Paid";
  if (t.claims.some((c) => c.status === "submitted")) return "Submitted";
  if (t.claims.length >= t.slots) return "Claimed";
  return "Open";
}

/* ---------- PartyTap guest accounts (demo, local-only) ---------- */

export function useAccount(): Account | null {
  const db = useDB();
  return db.accounts.find((a) => a.id === db.currentAccountId) ?? null;
}

export function authenticate(
  email: string,
  password: string,
): { ok: true; account: Account } | { ok: false; error: string } {
  const clean = email.trim().toLowerCase();
  const db = read();
  const existing = db.accounts.find((a) => a.email === clean);
  if (existing) {
    if (existing.password !== password) {
      return { ok: false, error: "That password doesn't match this email." };
    }
    update((d) => ({ ...d, currentAccountId: existing.id, signedIn: true }));
    return { ok: true, account: existing };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  const account: Account = {
    id: uid(8),
    email: clean,
    password,
    createdAt: new Date().toISOString(),
  };
  update((d) => ({
    ...d,
    accounts: [...d.accounts, account],
    currentAccountId: account.id,
    signedIn: true,
  }));
  return { ok: true, account };
}

export function signOutAccount() {
  update((d) => ({ ...d, currentAccountId: null, signedIn: false }));
}

export function myWork(db: DB, accountId: string) {
  return db.workTabs
    .map((tab) => ({ tab, claim: tab.claims.find((c) => c.userId === accountId) }))
    .filter((row): row is { tab: WorkTab; claim: Claim } => Boolean(row.claim));
}

export function myBundleRequests(db: DB, accountId: string) {
  return db.bundles
    .flatMap((bundle) => bundle.requests.map((request) => ({ bundle, request })))
    .filter((row) => row.request.userId === accountId);
}

/* ---------- pending action across the auth round-trip ---------- */

export type PendingAction =
  | { kind: "work"; id: string; name: string; contact: string }
  | { kind: "bundle"; id: string; form: Record<string, string> };

const PENDING_KEY = "partytap.pending";

export function setPending(action: PendingAction) {
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(action));
  } catch {
    /* ignore */
  }
}

export function takePending(kind: PendingAction["kind"], id: string): PendingAction | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAction;
    if (parsed.kind !== kind || parsed.id !== id) return null;
    window.sessionStorage.removeItem(PENDING_KEY);
    return parsed;
  } catch {
    return null;
  }
}
