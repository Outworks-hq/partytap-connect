import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Layers,
  Link2,
  Lock,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PartyTap — Post work. Get it done. Get paid." },
      {
        name: "description",
        content:
          "PartyTap lets you create paid Work Tabs and joint business Bundle Tabs, share a link, and track everything in one clean dashboard.",
      },
      { property: "og:title", content: "PartyTap — Post work. Get it done. Get paid." },
      {
        property: "og:description",
        content:
          "Create paid Work Tabs and two-business Bundle Tabs, share a link, and release payment when the work is done.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: Briefcase, label: "Admin creates a Work Tab" },
  { icon: Link2, label: "Shares the link anywhere" },
  { icon: CheckCircle2, label: "Guest accepts & gets details" },
  { icon: Upload, label: "Guest submits completed work" },
  { icon: Wallet, label: "Admin releases payment" },
  { icon: ShieldCheck, label: "Completed tab lands in history" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-surface hero-glow">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/account/auth" search={{ next: "/dashboard" }}>Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pt-10 pb-14 text-center sm:px-6 sm:pt-16">
        <span className="inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-bold tracking-widest text-primary-foreground uppercase">
          PartyTap
        </span>
        <h1 className="mt-6 text-4xl font-extrabold text-foreground sm:text-6xl">
          Post work. Get it done.{" "}
          <span className="text-primary">Get paid.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          One platform, two experiences. PartyTap Work for paid tasks. Bundles for joint
          offers between two businesses. Share a link — that's the whole flow.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/work/new">
              Create a Work Tab <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/bundles/new">Create a Bundle Tab</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-14 sm:px-6 md:grid-cols-2">
        <FeatureCard
          icon={Briefcase}
          eyebrow="Feature 1"
          title="PartyTap Work"
          body="Create a Work Tab with a public offer, private details that unlock only after someone accepts, and a demo payout you release when the work checks out."
          points={[
            "Public offer: task, pay, deadline, slots",
            "Accepted details stay locked until claim",
            "Release payment when you're ready",
          ]}
          to="/work"
        />
        <FeatureCard
          icon={Layers}
          eyebrow="Feature 2"
          title="Bundles"
          body="Pair Business A with Business B into one combined offer. Customers open the bundle link, book once, and each business fulfils its own service."
          points={[
            "Two businesses, one shared offer",
            "Customer books in a single step",
            "Requests land in your dashboard",
          ]}
          to="/bundles"
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl bg-sidebar p-6 sm:p-10">
          <p className="text-xs font-bold tracking-widest text-sidebar-foreground/60 uppercase">
            How it works
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {steps.map((s) => (
              <div key={s.label} className="flex items-start gap-3 lg:flex-col lg:items-center lg:text-center">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-sidebar-foreground/85">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Demo payment states only in this build.
        </p>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  points,
  to,
}: {
  icon: typeof Briefcase;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  to: string;
}) {
  return (
    <div className="card-soft p-6">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-bold tracking-widest text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <ul className="mt-4 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {p}
          </li>
        ))}
      </ul>
      <Button asChild variant="secondary" className="mt-5 w-full">
        <Link to={to}>Explore {title}</Link>
      </Button>
    </div>
  );
}
