import Link from "next/link";

export function RecentList({
  items,
}: {
  items: {
    id: string;
    title: string;
    sourceLang: string;
    targetLang: string;
    sourceName: string;
    targetName: string;
    updatedAt: Date;
  }[];
}) {
  if (items.length === 0) {
    return <p className="text-[13px] italic text-muted-foreground">No recent translations.</p>;
  }
  return (
    <ul className="divide-y divide-hairline border-y border-hairline">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/app?doc=${item.id}`}
            className="group flex items-baseline gap-4 py-3.5 text-[13px]"
          >
            <span className="flex-1 truncate text-foreground underline decoration-transparent decoration-1 underline-offset-[6px] transition-colors group-hover:decoration-ink">
              {item.title}
            </span>
            <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">
              {item.sourceName} → {item.targetName}
            </span>
            <span className="w-[6ch] text-right text-[11px] italic text-muted-foreground">
              {formatRelative(item.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function formatRelative(d: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}
