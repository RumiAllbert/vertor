import { cn } from "@/lib/utils";
import type { Milestone } from "@/lib/stats";

const STAMP_INDEX: Record<string, number> = {
  "first-voyage": 0,
  polyglot: 1,
  marathon: 2,
  "week-streak": 3,
  "night-owl": 4,
  "sunday-translator": 5,
  centennial: 6,
};

const STAMP_ACCENTS = [
  "#0056e3",
  "#12a594",
  "#e85d75",
  "#8f3f97",
  "#1f4f8f",
  "#f4a261",
  "#d84a4a",
];

// Passport-style stamps backed by the generated sticker sprite in /public.
// Earned stamps are saturated and reveal their unlock note on hover; locked
// ones stay ghosted but keep their shape.
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
      <ul className="flex flex-wrap gap-3.5">
        {items.map((m) => {
          const stampIndex = STAMP_INDEX[m.id] ?? 0;
          const accent = STAMP_ACCENTS[stampIndex % STAMP_ACCENTS.length];
          return (
            <li
              key={m.id}
              title={m.hint}
              className={cn(
                "dashboard-stamp group relative inline-flex min-h-16 w-[148px] items-center gap-2 overflow-visible rounded-[6px] border px-2.5 py-2 text-[12px] shadow-[0_14px_38px_color-mix(in_oklch,var(--stamp-accent)_11%,transparent)] transition duration-200 hover:-translate-y-0.5 hover:rotate-0 hover:shadow-[0_18px_48px_color-mix(in_oklch,var(--stamp-accent)_18%,transparent)]",
                m.earned
                  ? "border-[color-mix(in_oklch,var(--stamp-accent)_48%,var(--hairline))] bg-[color-mix(in_oklch,var(--stamp-accent)_9%,var(--background))] text-foreground"
                  : "border-hairline bg-background/60 text-muted-foreground/70 grayscale",
              )}
              style={{
                "--stamp-accent": accent,
                "--stamp-index": stampIndex,
                transform: `rotate(${stampIndex % 2 === 0 ? "-1.4deg" : "1.1deg"})`,
              } as React.CSSProperties}
            >
              <span className="relative z-10 inline-flex items-center gap-2 overflow-hidden rounded-[5px]">
                <span
                  aria-hidden
                  className={cn(
                    "dashboard-stamp-art h-12 w-12 shrink-0 drop-shadow-[0_7px_12px_color-mix(in_oklch,var(--stamp-accent)_18%,transparent)] transition duration-200 group-hover:scale-105",
                    m.earned ? "" : "opacity-[0.42]",
                  )}
                  style={{
                    backgroundImage: "url('/dashboard/stamp-sprite.png')",
                    backgroundPosition: `${(stampIndex / 6) * 100}% 50%`,
                  }}
                />
                <span
                  className={cn(
                    "italic leading-tight",
                    m.earned ? "" : "line-through decoration-hairline",
                  )}
                >
                  {m.label}
                </span>
              </span>
              {m.earned && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-hairline bg-background px-2.5 py-1.5 text-[11px] italic text-muted-foreground shadow-sm group-hover:block"
                >
                  <span className="not-italic text-ink">Earned · </span>
                  {m.hint}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
