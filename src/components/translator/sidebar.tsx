"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { LocalDoc } from "@/lib/doc-store";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr`;
  if (s < 604800) return `${Math.floor(s / 86400)} d`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HistorySidebar({
  docs,
  currentId,
  onSelect,
  onNew,
  onDelete,
}: {
  docs: LocalDoc[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = React.useState("");
  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return docs;
    return docs.filter((d) =>
      [d.title, d.sourceText, d.translatedText].some((s) => s.toLowerCase().includes(needle)),
    );
  }, [docs, q]);

  return (
    <aside className="flex h-full w-[252px] shrink-0 flex-col border-r border-hairline bg-muted/40">
      <div className="px-5 pt-6 pb-4">
        <h1 className="display text-[28px] leading-none">Vertor</h1>
        <p className="mt-1.5 text-[11px] italic text-muted-foreground">
          A workspace for translators.
        </p>
      </div>

      <div className="px-4 pb-3">
        <button
          onClick={onNew}
          className="group flex w-full items-baseline justify-between border-b border-hairline pb-2 text-left text-[13px] transition-colors hover:text-foreground"
        >
          <span className="font-medium">New document</span>
          <span className="text-muted-foreground transition-colors group-hover:text-ink">+</span>
        </button>
      </div>

      <div className="px-4 pb-2">
        <Input
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-8 border-0 border-b border-hairline rounded-none bg-transparent px-0 text-xs italic shadow-none focus-visible:ring-0 focus-visible:border-foreground"
        />
      </div>

      <div className="px-5 pt-3 pb-1.5">
        <span className="small-caps">Recent</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-6">
          {filtered.length === 0 && (
            <div className="px-3 py-10 text-center text-xs italic text-muted-foreground">
              Nothing here yet.
            </div>
          )}
          {filtered.map((d, i) => (
            <div
              key={d.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(d.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(d.id);
                }
              }}
              className={cn(
                "fade-up group relative flex w-full cursor-pointer items-start gap-3 rounded-sm px-3 py-2 text-left transition-colors",
                currentId === d.id
                  ? "bg-ink/10"
                  : "hover:bg-foreground/[0.04]",
              )}
              style={{ animationDelay: `${Math.min(i * 22, 300)}ms` }}
            >
              {currentId === d.id && (
                <span aria-hidden className="absolute left-0 top-2 bottom-2 w-px bg-ink" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium leading-tight">{d.title}</div>
                <div className="mt-1 flex items-center gap-2 text-[10.5px] text-muted-foreground">
                  <span>{timeAgo(d.updatedAt)}</span>
                  <span>·</span>
                  <span className="font-mono">{d.targetLang}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(d.id);
                }}
                className="text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
                aria-label="Delete"
              >
                delete
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
