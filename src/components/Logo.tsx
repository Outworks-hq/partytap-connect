export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="13" fill="currentColor" opacity="0.12" />
      <path
        d="M17 34V15h9.5a6.5 6.5 0 0 1 0 13H22"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30.5" cy="21.5" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  className = "",
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={`h-8 w-8 ${inverted ? "text-primary-foreground" : "text-primary"}`} />
      <span
        className={`text-lg font-extrabold tracking-tight ${
          inverted ? "text-sidebar-foreground" : "text-foreground"
        }`}
      >
        PartyTap
      </span>
    </span>
  );
}
