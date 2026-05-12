export function LanguageBars({
  items,
}: {
  items: { code: string; name: string; count: number; pct: number }[];
}) {
  if (items.length === 0) {
    return <p className="text-[13px] italic text-muted-foreground">No target languages yet.</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const width = max > 0 ? (item.count / max) * 100 : 0;
        return (
          <li key={item.code} className="flex items-baseline gap-4 text-[13px]">
            <span className="w-[10ch] shrink-0 truncate text-foreground">{item.name}</span>
            <span className="relative h-px flex-1 bg-hairline">
              <span
                className="absolute inset-y-0 left-0 bg-ink"
                style={{ width: `${width}%` }}
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
