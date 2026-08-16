import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function ContextSwitch({
  context,
  className,
}: {
  context: "personal" | "business";
  className?: string;
}) {
  const base =
    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm";
  return (
    <div
      className={cn(
        "inline-grid grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1",
        className,
      )}
      role="tablist"
      aria-label="PartyTap context"
    >
      <Link
        to="/me/work"
        role="tab"
        aria-selected={context === "personal"}
        className={cn(
          base,
          context === "personal"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Personal
      </Link>
      <Link
        to="/dashboard"
        role="tab"
        aria-selected={context === "business"}
        className={cn(
          base,
          context === "business"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Business
      </Link>
    </div>
  );
}
