import { cn } from "@/lib/utils";
import type { Milestone } from "@/lib/stats";

// Passport-style stamps. Earned ones rendered in ink, unearned in hairline
// gray. Hover to read the unlock condition.
export function Milestones({ items }: { items: Milestone[] }) {
  const earned = items.filter((m) => m.earned).length;
  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between border-b border-hairline pb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Stamps</span>
        <span className="not-italic text-foreground">
          {earned} <span className="text-muted-foreground">/ {items.length}</span>
        </span>
      </div>
      <ul className="flex flex-wrap gap-3">
        {items.map((m) => (
          <li
            key={m.id}
            title={m.hint}
            className={cn(
              "group relative inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors",
              m.earned
                ? "border-ink/70 bg-ink/[0.04] text-foreground"
                : "border-hairline text-muted-foreground/70",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                m.earned ? "bg-ink" : "bg-muted-foreground/40",
              )}
            />
            <span className={cn("italic", m.earned ? "" : "line-through decoration-hairline")}>
              {m.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
