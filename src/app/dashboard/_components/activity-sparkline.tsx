export function ActivitySparkline({ data }: { data: { day: string; count: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.count));
  const barCount = data.length;
  const barWidth = 100 / barCount;
  const gap = barWidth * 0.25;

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className="block h-16 w-full"
      role="img"
      aria-label="Translations per day over the last 30 days"
    >
      <line x1="0" y1="32" x2="100" y2="32" stroke="var(--hairline)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      {data.map((d, i) => {
        const h = (d.count / max) * 30;
        const x = i * barWidth + gap / 2;
        const y = 32 - h;
        const w = barWidth - gap;
        return (
          <rect
            key={d.day}
            x={x}
            y={y}
            width={w}
            height={Math.max(h, d.count > 0 ? 0.6 : 0)}
            fill={d.count > 0 ? "var(--ink)" : "var(--hairline)"}
          >
            <title>{`${d.day} — ${d.count} translation${d.count === 1 ? "" : "s"}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
