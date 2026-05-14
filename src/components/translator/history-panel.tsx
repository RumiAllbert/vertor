"use client";
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Revision, RevisionKind } from "@/lib/db/schema";

const KIND_LABEL: Record<RevisionKind, string> = {
  translated: "Translated",
  variation: "Variation",
  edit: "Edit",
  restored: "Restored",
};

function timeAgo(ts: Date): string {
  const s = Math.floor((Date.now() - ts.getTime()) / 1000);
  if (s < 30) return "just now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr`;
  return ts.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fullTimestamp(ts: Date): string {
  return ts.toLocaleString();
}

type Props = {
  revisions: Revision[];
  selectedRevisionId: string | null;
  onSelect: (revision: Revision | null) => void;
  onClose: () => void;
};

export function HistoryPanel({ revisions, selectedRevisionId, onSelect, onClose }: Props) {
  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex h-full w-[320px] max-w-[88vw] flex-col border-l border-hairline bg-background md:static md:z-auto md:shrink-0 md:bg-muted/40">
      <div className="flex items-baseline justify-between border-b border-hairline px-5 py-4">
        <div>
          <h2 className="display text-[20px] leading-none">History</h2>
          <p className="mt-1 text-[11px] italic text-muted-foreground">
            {revisions.length === 0
              ? "No revisions yet."
              : `${revisions.length} ${revisions.length === 1 ? "revision" : "revisions"}`}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close history"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Decorative "Current" anchor — clicking returns to live editing */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "fade-up relative flex w-full items-start gap-3 px-5 py-3 text-left transition-colors",
            selectedRevisionId === null ? "bg-ink/10" : "hover:bg-foreground/[0.04]",
          )}
        >
          {selectedRevisionId === null && (
            <span aria-hidden className="absolute left-0 top-2 bottom-2 w-px bg-ink" />
          )}
          <div className="flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12.5px] font-medium">Current</span>
              <span className="font-mono text-[10px] text-muted-foreground">●</span>
            </div>
            <p className="mt-0.5 text-[11px] italic text-muted-foreground">
              Live document
            </p>
          </div>
        </button>

        {revisions.length === 0 ? (
          <div className="px-5 py-8 text-center text-[11px] italic text-muted-foreground">
            Translate or edit to capture a snapshot.
          </div>
        ) : (
          revisions.map((r, i) => {
            const isSelected = r.id === selectedRevisionId;
            return (
              <button
                key={r.id}
                onClick={() => onSelect(r)}
                className={cn(
                  "fade-up relative flex w-full items-start gap-3 px-5 py-3 text-left transition-colors",
                  isSelected ? "bg-ink/10" : "hover:bg-foreground/[0.04]",
                )}
                style={{ animationDelay: `${Math.min(i * 22, 300)}ms` }}
                title={fullTimestamp(r.ts)}
              >
                {isSelected && (
                  <span aria-hidden className="absolute left-0 top-2 bottom-2 w-px bg-ink" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="small-caps">{KIND_LABEL[r.kind]}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {timeAgo(r.ts)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11.5px] italic text-muted-foreground">
                    {r.summary ?? r.modelId ?? "—"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
