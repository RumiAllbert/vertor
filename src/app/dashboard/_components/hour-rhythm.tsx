// 24-hour rhythm strip — one bar per hour, ink for active hours, hairline for
// silent ones. The peak hour is marked with a tiny caret above it so the
// editorial copy underneath has a visible referent.

import { hourLabel } from "@/lib/stats";

function format12(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

export function HourRhythm({
  rhythm,
  peakHour,
}: {
  rhythm: number[];
  peakHour: number | null;
}) {
  const max = rhythm.reduce((m, n) => (n > m ? n : m), 0);
  const total = rhythm.reduce((s, n) => s + n, 0);
  const hourColors = ["#1f4f8f", "#0056e3", "#12a594", "#f4a261", "#e85d75", "#8f3f97"];
  return (
    <div>
      <div className="grid h-20 grid-cols-24 items-end gap-px" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
        {rhythm.map((n, h) => {
          const ratio = max > 0 ? n / max : 0;
          const heightPct = n === 0 ? 4 : Math.max(8, Math.round(ratio * 100));
          const isPeak = h === peakHour;
          const color = hourColors[Math.floor(h / 4) % hourColors.length];
          return (
            <div
              key={h}
              title={`${n} at ${format12(h)}`}
              className="relative flex items-end justify-center"
            >
              {isPeak && peakHour !== null && (
                <span
                  aria-hidden
                  className="absolute -top-2.5 text-[10px] leading-none text-ink"
                >
                  ▾
                </span>
              )}
              <div
                className={n > 0 ? "w-full rounded-[1px]" : "w-full bg-hairline"}
                style={{ height: `${heightPct}%`, backgroundColor: n > 0 ? color : undefined }}
              />
            </div>
          );
        })}
      </div>
      {/* Hour ticks: just 12am / 6am / 12pm / 6pm */}
      <div
        className="mt-2 grid text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
        style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
      >
        <span>12am</span>
        <span className="text-center">6am</span>
        <span className="text-center">12pm</span>
        <span className="text-right">6pm</span>
      </div>
      <p className="mt-3 text-[12px] italic text-muted-foreground">
        {peakHour === null || total === 0 ? (
          <>No rhythm to read yet.</>
        ) : (
          <>
            You translate most around{" "}
            <span className="not-italic text-foreground">{format12(peakHour)}</span>
            {" — "}
            <span>{hourLabel(peakHour)}.</span>
          </>
        )}
      </p>
    </div>
  );
}
