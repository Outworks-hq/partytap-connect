import { Link } from "@tanstack/react-router";
import { CircleUser, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

export function GuestShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface hero-glow">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3.5">
          <Link to="/" aria-label="PartyTap home">
            <Logo />
          </Link>
          <Link
            to="/me/work"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground"
          >
            <CircleUser className="h-4 w-4 text-primary" />
            My PartyTap
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 pb-16">{children}</main>
      <footer className="mx-auto flex max-w-2xl items-center justify-center gap-2 pb-10 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        Demo payments — powered by PartyTap
      </footer>
    </div>
  );
}
