import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { Button } from "@/components/ui/button";

export function MeShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppShell context="personal" title={title} subtitle={subtitle} action={action}>
      {children}
    </AppShell>
  );
}

export function SignedOutNotice({ next }: { next: string }) {
  return (
    <div className="card-soft p-8 text-center">
      <p className="text-base font-bold text-foreground">Sign in to see this</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Your accepted Work Tabs and bundle requests live in your PartyTap account.
      </p>
      <Button asChild className="mt-4">
        <Link to="/account/auth" search={{ next }}>
          Sign in or create an account
        </Link>
      </Button>
    </div>
  );
}
