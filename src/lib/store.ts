import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
export type DetailItem = { id: string; label: string; value: string };
import { useEffect, useState } from "react";

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
  stripeConnectOnboarded?: boolean;
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
  balance: 0,
  payoutConnected: false,
  signedIn: false,
  accounts: [],
  currentAccountId: null,
  activeContext: "business",
  workTabs: [],
  bundles: [],
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
    stripeConnectOnboarded: profile.stripe_connect_onboarded ?? false,
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
      balance: Number(profile.balance ?? 0),
    };
  });
}

async function syncWorkTabsToCache(businessId: string) {
  const { data: tabs } = await supabase
    .from("work_tabs")
    .select("*, work_tab_claims(*)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!tabs) return;

  const workTabs: WorkTab[] = tabs.map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    pay: Number(t.pay),
    deadline: t.deadline ?? "",
    slots: t.slots,
    details: t.details ?? [],
    payoutSource: t.payout_source ?? "",
    createdAt: t.created_at,
    claims: (t.work_tab_claims ?? []).map((c: any) => ({
      id: c.id,
      userId: c.user_id ?? undefined,
      name: c.name,
      contact: c.contact,
      status: c.status,
      note: c.note ?? undefined,
      acceptedAt: c.accepted_at,
      submittedAt: c.submitted_at ?? undefined,
    })),
  }));

  update((d) => ({ ...d, workTabs }));
}

async function syncBundlesToCache(businessId: string) {
  const { data: bundlesData } = await supabase
    .from("bundles")
    .select("*, bundle_requests(*)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!bundlesData) return;

  const bundles: BundleTab[] = bundlesData.map((b: any) => ({
    id: b.id,
    title: b.title,
    description: b.description ?? "",
    businessA: { name: b.business_a_name, service: b.business_a_service },
    businessB: { name: b.business_b_name, service: b.business_b_service },
    createdAt: b.created_at,
    requests: (b.bundle_requests ?? []).map((r: any) => ({
      id: r.id,
      userId: r.user_id ?? undefined,
      name: r.name,
      phone: r.phone ?? "",
      address: r.address ?? "",
      date: r.date ?? "",
      time: r.time ?? "",
      notes: r.notes ?? undefined,
      createdAt: r.created_at,
      status: r.status,
    })),
  }));

  update((d) => ({ ...d, bundles }));
}

export async function startStripeConnectOnboarding(): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { ok: false, error: "Not signed in." };

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboarding`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const result = await response.json();
  if (!response.ok || !result.url) {
    return { ok: false, error: result.error ?? "Could not start onboarding." };
  }
  return { ok: true, url: result.url };
}

export async function refreshBusinessData() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await Promise.all([
    syncWorkTabsToCache(userData.user.id),
    syncBundlesToCache(userData.user.id),
  ]);
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

export async function verifyPendingTopups(): Promise<number> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return 0;

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-verify-session`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const result = await response.json();
  const credited = Number(result?.credited ?? 0);

  if (credited > 0) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) await syncProfileToCache(userData.user.id);
  }

  return credited;
}

export async function fetchMyClaimedWork(): Promise<Array<{ tab: WorkTab; claim: Claim }>> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data: claims } = await supabase
    .from("work_tab_claims")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("accepted_at", { ascending: false });

  if (!claims || claims.length === 0) return [];

  const tabIds = [...new Set(claims.map((c: any) => c.work_tab_id))];
  const { data: tabs } = await supabase.from("work_tabs").select("*").in("id", tabIds);

  const tabsById = new Map((tabs ?? []).map((t: any) => [t.id, t]));

  return claims
    .filter((c: any) => tabsById.has(c.work_tab_id))
    .map((c: any) => {
      const t = tabsById.get(c.work_tab_id);
      return {
        tab: {
          id: t.id,
          title: t.title,
          description: t.description ?? "",
          pay: Number(t.pay),
          deadline: t.deadline ?? "",
          slots: t.slots,
          details: t.details ?? [],
          payoutSource: t.payout_source ?? "",
          createdAt: t.created_at,
          claims: [],
        } as WorkTab,
        claim: {
          id: c.id,
          userId: c.user_id ?? undefined,
          name: c.name,
          contact: c.contact,
          status: c.status,
          note: c.note ?? undefined,
          acceptedAt: c.accepted_at,
          submittedAt: c.submitted_at ?? undefined,
        } as Claim,
      };
    });
}

export async function fetchMyBundleRequests(): Promise<
  Array<{ bundle: BundleTab; request: BundleRequest }>
> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data: requests } = await supabase
    .from("bundle_requests")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (!requests || requests.length === 0) return [];

  const bundleIds = [...new Set(requests.map((r: any) => r.bundle_id))];
  const { data: bundlesData } = await supabase.from("bundles").select("*").in("id", bundleIds);

  const bundlesById = new Map((bundlesData ?? []).map((b: any) => [b.id, b]));

  return requests
    .filter((r: any) => bundlesById.has(r.bundle_id))
    .map((r: any) => {
      const b = bundlesById.get(r.bundle_id);
      return {
        bundle: {
          id: b.id,
          title: b.title,
          description: b.description ?? "",
          businessA: { name: b.business_a_name, service: b.business_a_service },
          businessB: { name: b.business_b_name, service: b.business_b_service },
          createdAt: b.created_at,
          requests: [],
        } as BundleTab,
        request: {
          id: r.id,
          userId: r.user_id ?? undefined,
          name: r.name,
          phone: r.phone ?? "",
          address: r.address ?? "",
          date: r.date ?? "",
          time: r.time ?? "",
          notes: r.notes ?? undefined,
          createdAt: r.created_at,
          status: r.status,
        } as BundleRequest,
      };
    });
}

export async function startAddFunds(
  amount: number,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { ok: false, error: "Not signed in." };

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-add-funds`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    },
  );

  const result = await response.json();
  if (!response.ok || !result.url) {
    return { ok: false, error: result.error ?? "Could not start checkout." };
  }
  return { ok: true, url: result.url };
}

export async function fetchWorkTabById(id: string): Promise<WorkTab | null> {
  const { data: t } = await supabase
    .from("work_tabs")
    .select("*, work_tab_claims(*)")
    .eq("id", id)
    .single();

  if (!t) return null;

  return {
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    pay: Number(t.pay),
    deadline: t.deadline ?? "",
    slots: t.slots,
    details: t.details ?? [],
    payoutSource: t.payout_source ?? "",
    createdAt: t.created_at,
    claims: (t.work_tab_claims ?? []).map((c: any) => ({
      id: c.id,
      userId: c.user_id ?? undefined,
      name: c.name,
      contact: c.contact,
      status: c.status,
      note: c.note ?? undefined,
      acceptedAt: c.accepted_at,
      submittedAt: c.submitted_at ?? undefined,
    })),
  };
}

export async function createWorkTabClaim(payload: {
  workTabId: string;
  name: string;
  contact: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("work_tab_claims").insert({
    work_tab_id: payload.workTabId,
    user_id: payload.userId,
    name: payload.name,
    contact: payload.contact,
    status: "accepted",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function submitWorkTabClaim(claimId: string, note: string) {
  await supabase
    .from("work_tab_claims")
    .update({ status: "submitted", note, submitted_at: new Date().toISOString() })
    .eq("id", claimId);
}

export async function releaseWorkTabPayment(
  claimId: string,
  _amount: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { ok: false, error: "Not signed in." };

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-release-payment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ claimId }),
    },
  );

  const result = await response.json();
  if (!response.ok) {
    return { ok: false, error: result.error ?? "Could not release payment." };
  }
  return { ok: true };
}

export async function scheduleBundleRequest(
  requestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("bundle_requests")
    .update({ status: "scheduled" })
    .eq("id", requestId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function refreshStripeConnectStatus(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return false;

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const result = await response.json();
  if (result?.onboarded) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) await syncProfileToCache(userData.user.id);
  }
  return !!result?.onboarded;
}

export async function fetchBundleById(id: string): Promise<BundleTab | null> {
  const { data: b } = await supabase
    .from("bundles")
    .select("*, bundle_requests(*)")
    .eq("id", id)
    .single();

  if (!b) return null;

  return {
    id: b.id,
    title: b.title,
    description: b.description ?? "",
    businessA: { name: b.business_a_name, service: b.business_a_service },
    businessB: { name: b.business_b_name, service: b.business_b_service },
    createdAt: b.created_at,
    requests: (b.bundle_requests ?? []).map((r: any) => ({
      id: r.id,
      userId: r.user_id ?? undefined,
      name: r.name,
      phone: r.phone ?? "",
      address: r.address ?? "",
      date: r.date ?? "",
      time: r.time ?? "",
      notes: r.notes ?? undefined,
      createdAt: r.created_at,
      status: r.status,
    })),
  };
}


export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
};

export async function startSaveCard(): Promise<
  { ok: true; clientSecret: string } | { ok: false; error: string }
> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { ok: false, error: "Not signed in." };

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-save-card`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const result = await response.json();
  if (!response.ok || !result.clientSecret) {
    return { ok: false, error: result.error ?? "Could not start card setup." };
  }
  return { ok: true, clientSecret: result.clientSecret };
}

export async function fetchSavedCards(): Promise<SavedCard[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return [];

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-list-cards`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const result = await response.json();
  return result?.cards ?? [];
}

export async function createBundleRequest(payload: {
  bundleId: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  date: string;
  time: string;
  notes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("bundle_requests").insert({
    bundle_id: payload.bundleId,
    user_id: payload.userId,
    name: payload.name,
    phone: payload.phone,
    address: payload.address,
    date: payload.date,
    time: payload.time,
    notes: payload.notes ?? null,
    status: "new",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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

  let profile: any = null;
  for (let attempt = 0; attempt < 3 && !profile; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400));
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.session.user.id)
      .single();
    if (p) profile = p;
  }

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
    stripeConnectOnboarded: profile.stripe_connect_onboarded ?? false,
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

export async function requireBusinessAccount(): Promise<Account | "skip" | null> {
  if (typeof window === "undefined") return "skip";
  return getAuthedAccount();
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
    stripeConnectOnboarded: profile.stripe_connect_onboarded ?? false,
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
  const stripeConnected = account?.stripeConnectOnboarded ?? false;
  if (context === "personal") {
    return {
      paymentConnected: true,
      payoutConnected: stripeConnected,
    };
  }
  return {
    paymentConnected: account?.business?.paymentConnected ?? false,
    payoutConnected: stripeConnected,
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
