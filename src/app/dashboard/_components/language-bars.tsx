export function LanguageBars({
  items,
}: {
  items: { code: string; name: string; count: number; pct: number }[];
}) {
  if (items.length === 0) {
    return <p className="text-[13px] italic text-muted-foreground">No target languages yet.</p>;
  }
  const max = Math.max(...items.map((i) => i.count));
  const colors = ["#0056e3", "#12a594", "#e85d75", "#f4a261", "#8f3f97", "#2a7f62"];
  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const width = max > 0 ? (item.count / max) * 100 : 0;
        const color = colors[index % colors.length];
        return (
          <li key={item.code} className="flex items-baseline gap-4 text-[13px]">
            <span className="w-[10ch] shrink-0 truncate text-foreground">{item.name}</span>
            <span className="relative h-px flex-1 bg-hairline">
              <span
                className="absolute inset-y-0 left-0 shadow-[0_0_18px_color-mix(in_oklch,var(--bar-accent)_20%,transparent)]"
                style={{ width: `${width}%`, backgroundColor: color, "--bar-accent": color } as React.CSSProperties}
                aria-hidden
              />
            </span>
            <span className="tabular-nums text-muted-foreground">{item.count}</span>
            <span className="w-[4ch] tabular-nums text-right text-[11px] italic text-muted-foreground">
              {Math.round(item.pct)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}
