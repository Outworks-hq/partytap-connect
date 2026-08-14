import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CopyLink({ path, label = "Shareable link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" ? new URL(path, window.location.origin).toString() : path;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
      <Link2 className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-primary">{url}</p>
      </div>
      <button
        type="button"
        aria-label="Copy link"
        onClick={() => {
          navigator.clipboard?.writeText(url);
          setCopied(true);
          toast.success("Link copied");
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </button>
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        aria-label="Open guest view in a new tab"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-accent"
      >
        <ExternalLink className="h-4 w-4" />
        <span className="hidden sm:inline">Open</span>
      </a>
    </div>
  );
}
