import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Settings as SettingsIcon, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { accountSides, signOutAccount, useAccount } from "@/lib/store";

export function accountLabel(account: { name?: string; email: string; phone?: string }) {
  return account.name || account.email || account.phone || "PartyTap user";
}

export function AccountAvatar({
  account,
  className = "h-8 w-8",
}: {
  account: { name?: string; email: string; phone?: string; avatar?: string };
  className?: string;
}) {
  const label = accountLabel(account);
  if (account.avatar) {
    return (
      <img
        src={account.avatar}
        alt={label}
        className={`${className} rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`${className} grid place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground`}
      aria-hidden
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

export function AccountMenu({ signInNext }: { signInNext?: string }) {
  const account = useAccount();
  const navigate = useNavigate();

  if (!account) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link to="/account/auth" search={signInNext ? { next: signInNext } : {}}>
          <UserRound className="h-4 w-4" /> Sign in
        </Link>
      </Button>
    );
  }

  const primary = accountSides(account)[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pr-3 pl-1 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          <AccountAvatar account={account} />
          <span className="max-w-[10rem] truncate">{accountLabel(account)}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">{accountLabel(account)}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={primary === "personal" ? "/me/work" : "/dashboard"}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <SettingsIcon className="h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOutAccount();
            navigate({ to: "/" });
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
