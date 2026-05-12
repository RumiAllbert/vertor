export function ModelsList({
  items,
}: {
  items: { id: string; name: string; count: number; pct: number }[];
}) {
  if (items.length === 0) {
    return <p className="text-[13px] italic text-muted-foreground">No model usage yet.</p>;
  }
  return (
    <ul className="space-y-3 text-[13px]">
      {items.map((m) => (
        <li key={m.id} className="flex items-baseline gap-4">
          <span className="truncate text-foreground">{m.name}</span>
          <span className="h-px flex-1 self-center bg-hairline" aria-hidden />
          <span className="tabular-nums text-muted-foreground">{m.count}</span>
          <span className="w-[4ch] tabular-nums text-right text-[11px] italic text-muted-foreground">
            {Math.round(m.pct)}%
          </span>
        </li>
      ))}
    </ul>
  );
}
