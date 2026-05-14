// Year-in-glance heatmap. Renders ~53 weekly columns of 7 day cells. Cells
// scale through a small editorial color ramp so the dashboard feels less
// monochrome without losing the printed-calendar mood.

const INTENSITY_COLORS = [
  "color-mix(in oklch, var(--hairline) 60%, transparent)",
  "color-mix(in oklch, #0056e3 18%, var(--background))",
  "color-mix(in oklch, #12a594 30%, var(--background))",
  "color-mix(in oklch, #e85d75 45%, var(--background))",
  "color-mix(in oklch, #f4a261 62%, var(--background))",
];

function intensityColor(count: number, maxCount: number): string {
  if (count <= 0 || maxCount <= 0) return INTENSITY_COLORS[0];
  // Bucket into 4 active intensities; clamp the noisy top end.
  const t = Math.min(1, count / Math.max(2, maxCount));
  const idx = 1 + Math.min(3, Math.floor(t * 4));
  return INTENSITY_COLORS[idx];
}

function monthLabel(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString(undefined, {
    month: "short",
  });
}

export function YearHeatmap({ data }: { data: { day: string; count: number }[] }) {
  if (data.length === 0) return null;

  // Align so the first column starts on a Sunday — pad with blank cells.
  const firstDow = new Date(data[0].day + "T00:00:00Z").getUTCDay();
  const padded: ({ day: string; count: number } | null)[] = [
    ...Array(firstDow).fill(null),
    ...data,
  ];
  const weeks: ({ day: string; count: number } | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const maxCount = data.reduce((m, d) => (d.count > m ? d.count : m), 0);
  const totalActive = data.filter((d) => d.count > 0).length;
  const totalCount = data.reduce((s, d) => s + d.count, 0);

  // Month markers — first column of each new month gets a small label above.
  const monthSlots: { col: number; label: string }[] = [];
  let lastMonth = "";
  weeks.forEach((week, col) => {
    const firstReal = week.find((c) => c !== null);
    if (!firstReal) return;
    const m = firstReal.day.slice(0, 7);
    if (m !== lastMonth) {
      lastMonth = m;
      monthSlots.push({ col, label: monthLabel(firstReal.day) });
    }
  });

  // Cell sizing in CSS pixels — keep total ≈ 700px wide so it fits the
  // dashboard column on desktop and scrolls on mobile.
  const cell = 11;
  const gap = 3;
  const width = weeks.length * (cell + gap) - gap;
  const height = 7 * (cell + gap) - gap;

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="relative inline-block"
        style={{ minWidth: width + 18 }}
      >
        {/* Month labels */}
        <div
          className="relative mb-1 h-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
          style={{ width }}
        >
          {monthSlots.map(({ col, label }) => (
            <span
              key={`${col}-${label}`}
              className="absolute top-0"
              style={{ left: col * (cell + gap) }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Grid — one flex column per week, 7 cells stacked top-to-bottom. */}
        <div className="flex" style={{ gap, width, height }}>
          {weeks.map((week, col) => (
            <div key={col} className="flex flex-col" style={{ gap, width: cell }}>
              {week.map((cellData, row) => {
                if (!cellData) {
                  return (
                    <span
                      key={row}
                      aria-hidden
                      className="rounded-[2px] bg-transparent"
                      style={{ width: cell, height: cell }}
                    />
                  );
                }
                const color = intensityColor(cellData.count, maxCount);
                const title = `${cellData.count} on ${cellData.day}`;
                return (
                  <span
                    key={row}
                    title={title}
                    className="rounded-[2px]"
                    style={{ width: cell, height: cell, backgroundColor: color }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer: legend + totals */}
        <div className="mt-3 flex items-center justify-between text-[11px] italic text-muted-foreground">
          <span>
            <span className="not-italic text-foreground">{totalCount}</span>{" "}
            translation{totalCount === 1 ? "" : "s"} across{" "}
            <span className="not-italic text-foreground">{totalActive}</span> day
            {totalActive === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="not-italic">less</span>
            {INTENSITY_COLORS.map((color, i) => (
              <span
                key={i}
                className="inline-block rounded-[2px]"
                style={{ width: 10, height: 10, backgroundColor: color }}
              />
            ))}
            <span className="not-italic">more</span>
          </span>
        </div>
      </div>
    </div>
  );
}
