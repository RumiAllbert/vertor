import { cn } from "@/lib/utils";
import type { Milestone } from "@/lib/stats";

// Passport-style stamps. Earned stamps are inked and reveal how they were
// unlocked on hover; unearned ones are sealed shut behind a lock.
export function Milestones({ items }: { items: Milestone[] }) {
  const earned = items.filter((m) => m.earned).length;
  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between border-b border-hairline pb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Stamps</span>
        <span className="not-italic">
          <span className="text-ink">{earned}</span>
          <span className="text-muted-foreground"> / {items.length}</span>
        </span>
      </div>
      <ul className="flex flex-wrap gap-3">
        {items.map((m) =>
          m.earned ? <EarnedStamp key={m.id} m={m} /> : <LockedStamp key={m.id} m={m} />,
        )}
      </ul>
    </div>
  );
}

function EarnedStamp({ m }: { m: Milestone }) {
  return (
    <li className="group relative inline-flex">
      <span className="inline-flex items-center gap-2 rounded-full border border-ink/60 bg-ink/[0.06] px-3.5 py-1.5 text-[12px] text-foreground transition-colors group-hover:border-ink group-hover:bg-ink/[0.1]">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-ink" />
        <span className="italic">{m.label}</span>
      </span>
      {/* Hover-revealed unlock note. Positioned above, hairline card with
          ink accent line. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-hairline bg-background px-2.5 py-1.5 text-[11px] italic text-muted-foreground shadow-sm group-hover:block"
      >
        <span className="not-italic text-ink">Earned · </span>
        {m.hint}
      </span>
    </li>
  );
}

function LockedStamp({ m }: { m: Milestone }) {
  return (
    <li
      title={m.hint}
      className="inline-flex items-center gap-2 rounded-full border border-dashed border-hairline px-3.5 py-1.5 text-[12px] text-muted-foreground/70"
    >
      <LockIcon className="h-3 w-3 opacity-60" />
      <span className="italic">{m.label}</span>
    </li>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="11" width="16" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
