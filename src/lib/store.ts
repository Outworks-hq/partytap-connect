import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
export type DetailItem = { id: string; label: string; value: string };

export type AccountContext = "personal" | "business";

export type PersonalSide = { createdAt: string; payoutConnected: boolean };
export type BusinessSide = {
  createdAt: string;
  paymentConnected: boolean;
  payoutConnected: boolean;
};

export type Account = {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  avatar?: string;
  password: string;
  verified?: boolean;
  createdAt: string;
  personal?: PersonalSide;
  business?: BusinessSide;
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
  activeContext: AccountContext;
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
  activeContext: "business",
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

async function syncProfileToCache(userId: string) {
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!profile) return;

  const account: Account = {
    id: profile.id,
    email: profile.email ?? "",
    phone: profile.phone ?? undefined,
    name: profile.name ?? undefined,
    avatar: profile.avatar ?? undefined,
    password: "",
    verified: true,
    createdAt: profile.created_at,
    ...(profile.has_personal
      ? { personal: { createdAt: profile.created_at, payoutConnected: profile.personal_payout_connected } }
      : {}),
    ...(profile.has_business
      ? {
          business: {
            createdAt: profile.created_at,
            paymentConnected: profile.business_payment_connected,
            payoutConnected: profile.business_payout_connected,
          },
        }
      : {}),
  };

  update((d) => {
    const others = d.accounts.filter((a) => a.id !== account.id);
    return {
      ...d,
      accounts: [...others, account],
      currentAccountId: account.id,
      signedIn: true,
    };
  });
}

if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) syncProfileToCache(data.session.user.id);
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      syncProfileToCache(session.user.id);
    } else if (event === "SIGNED_OUT") {
      update((d) => ({ ...d, currentAccountId: null, signedIn: false }));
    }
  });
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


export async function getAuthedAccount(): Promise<Account | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.session.user.id)
    .single();

  if (!profile) return null;

  const account: Account = {
    id: profile.id,
    email: profile.email ?? "",
    phone: profile.phone ?? undefined,
    name: profile.name ?? undefined,
    avatar: profile.avatar ?? undefined,
    password: "",
    verified: true,
    createdAt: profile.created_at,
    ...(profile.has_personal
      ? { personal: { createdAt: profile.created_at, payoutConnected: profile.personal_payout_connected } }
      : {}),
    ...(profile.has_business
      ? {
          business: {
            createdAt: profile.created_at,
            paymentConnected: profile.business_payment_connected,
            payoutConnected: profile.business_payout_connected,
          },
        }
      : {}),
  };

  return account;
}

/* ---------- PartyTap guest accounts (demo, local-only) ---------- */

export function useAccount(): Account | null {
  const db = useDB();
  return db.accounts.find((a) => a.id === db.currentAccountId) ?? null;
}

function newPersonal(): PersonalSide {
  return { createdAt: new Date().toISOString(), payoutConnected: false };
}

function newBusiness(): BusinessSide {
  return { createdAt: new Date().toISOString(), paymentConnected: false, payoutConnected: false };
}

/** Accounts created before contexts existed behave as personal + business. */
export function accountSides(account: Account): AccountContext[] {
  const sides: AccountContext[] = [];
  if (account.personal) sides.push("personal");
  if (account.business) sides.push("business");
  if (sides.length === 0) return ["personal", "business"];
  return sides;
}

export function hasSide(account: Account | null, context: AccountContext) {
  return account ? accountSides(account).includes(context) : false;
}

export function useActiveContext(): AccountContext {
  const db = useDB();
  const account = useAccount();
  if (!account) return db.activeContext;
  const sides = accountSides(account);
  if (sides.includes(db.activeContext)) return db.activeContext;
  return sides[0] as AccountContext;
}

export function setActiveContext(context: AccountContext) {
  update((d) => ({ ...d, activeContext: context }));
}

function normalize(identifier: string) {
  return identifier.trim().toLowerCase();
}

function findAccount(db: DB, identifier: string) {
  const clean = normalize(identifier);
  return db.accounts.find((a) => a.email === clean || a.phone === clean);
}

export type AuthResult =
  | { ok: true; account: Account; newAccount?: boolean }
  | { ok: false; error: string };

export async function signIn(identifier: string, password: string): Promise<AuthResult> {
  const clean = normalize(identifier);
  const isPhone = !clean.includes("@");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: isPhone ? undefined : clean,
    phone: isPhone ? clean : undefined,
    password,
  });

  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Sign in failed. Try again." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: "Could not load account profile." };
  }

  const account: Account = {
    id: profile.id,
    email: profile.email ?? "",
    phone: profile.phone ?? undefined,
    name: profile.name ?? undefined,
    avatar: profile.avatar ?? undefined,
    password: "",
    verified: true,
    createdAt: profile.created_at,
    ...(profile.has_personal
      ? { personal: { createdAt: profile.created_at, payoutConnected: profile.personal_payout_connected } }
      : {}),
    ...(profile.has_business
      ? {
          business: {
            createdAt: profile.created_at,
            paymentConnected: profile.business_payment_connected,
            payoutConnected: profile.business_payout_connected,
          },
        }
      : {}),
  };

  return { ok: true, account };
}

export async function signUp(input: {
  identifier: string;
  password: string;
  name?: string;
  context: AccountContext;
}): Promise<AuthResult> {
  const clean = normalize(input.identifier);
  const isPhone = !clean.includes("@");

  const { data, error } = await supabase.auth.signUp({
    email: isPhone ? undefined : clean,
    phone: isPhone ? clean : undefined,
    password: input.password,
    options: {
      data: {
        name: input.name ?? null,
        context: input.context,
      },
    },
  });

  if (error) return { ok: false, error: error.message };

  const alreadyExists = !!data.user && (!data.user.identities || data.user.identities.length === 0);

  if (alreadyExists) {
    const signInResult = await signIn(input.identifier, input.password);
    if (!signInResult.ok) {
      return { ok: false, error: "An account with this email already exists. Please sign in instead." };
    }
    const sides = accountSides(signInResult.account);
    if (sides.includes(input.context)) {
      await signOutAccount();
      return {
        ok: false,
        error: `An account with this email already has a ${input.context} side. Please sign in instead.`,
      };
    }
    return { ok: true, account: signInResult.account, newAccount: false };
  }

  if (!data.user) return { ok: false, error: "Sign up failed. Try again." };

  const account: Account = {
    id: data.user.id,
    email: isPhone ? "" : clean,
    ...(isPhone ? { phone: clean } : {}),
    ...(input.name ? { name: input.name } : {}),
    password: "",
    verified: true,
    createdAt: new Date().toISOString(),
    ...(input.context === "personal" ? { personal: newPersonal() } : { business: newBusiness() }),
  };

  return { ok: true, account, newAccount: true };
}

/**
 * Recipient flow: someone accepting a Work Tab or confirming a Bundle.
 * Signs in when the account exists, otherwise creates a Personal account.
 */
export async function authenticate(identifier: string, password: string): Promise<AuthResult> {
  const signInResult = await signIn(identifier, password);
  if (signInResult.ok) {
    if (!signInResult.account.personal) {
      await addContext("personal");
      const refreshed = await signIn(identifier, password);
      return refreshed;
    }
    setActiveContext("personal");
    return signInResult;
  }
  return signUp({ identifier, password, context: "personal" });
}

/** Add the other side of PartyTap to the signed-in identity. */
export async function addContext(context: AccountContext) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase
    .from("profiles")
    .update(context === "personal" ? { has_personal: true } : { has_business: true })
    .eq("id", userData.user.id);

  await syncProfileToCache(userData.user.id);
  update((d) => ({ ...d, activeContext: context }));
}

export async function updateProfile(patch: Partial<Pick<Account, "name" | "email" | "phone" | "avatar">>) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase.from("profiles").update(patch).eq("id", userData.user.id);
}

export async function setConnection(
  context: AccountContext,
  key: "paymentConnected" | "payoutConnected",
  value: boolean,
) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const column =
    context === "personal"
      ? "personal_payout_connected"
      : key === "paymentConnected"
        ? "business_payment_connected"
        : "business_payout_connected";

  await supabase.from("profiles").update({ [column]: value }).eq("id", userData.user.id);

  update((d) => ({
    ...d,
    payoutConnected: context === "business" && key === "payoutConnected" ? value : d.payoutConnected,
  }));
}

export function connectionState(account: Account | null, context: AccountContext) {
  if (context === "personal") {
    return {
      paymentConnected: true,
      payoutConnected: account?.personal?.payoutConnected ?? false,
    };
  }
  return {
    paymentConnected: account?.business?.paymentConnected ?? false,
    payoutConnected: account?.business?.payoutConnected ?? false,
  };
}

export async function signOutAccount() {
  await supabase.auth.signOut();
  update((d) => ({ ...d, currentAccountId: null, signedIn: false, activeContext: "business" }));
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
