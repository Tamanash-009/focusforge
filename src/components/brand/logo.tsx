import { clsx } from "clsx";

type LogoProps = {
  compact?: boolean;
  className?: string;
};

export function FocusForgeMark({ className }: { className?: string }) {
  return (
    <svg
      className={clsx("h-9 w-9 text-[var(--brand-mark)]", className)}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="FocusForge mark"
    >
      <rect width="64" height="64" rx="16" fill="currentColor" opacity="0.12" />
      <circle cx="32" cy="32" r="21" stroke="currentColor" strokeWidth="5" />
      <path d="M24 19H43V27H32V33H41V40H32V48H24V19Z" fill="currentColor" />
      <path d="M43 19L47 23L43 27V19Z" fill="currentColor" opacity="0.58" />
    </svg>
  );
}

export function FocusForgeLogo({ compact = false, className }: LogoProps) {
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <FocusForgeMark />
      {!compact && (
        <div className="leading-none">
          <span className="block text-lg font-bold text-[var(--text-strong)]">FocusForge</span>
          <span className="brand-tagline block text-xs font-medium text-[var(--text-muted)]">Study operating system</span>
        </div>
      )}
    </div>
  );
}
