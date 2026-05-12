"use client";
import * as React from "react";
import { computeDiff } from "@/lib/diff";
import type { Revision } from "@/lib/db/schema";

type Props = {
  revision: Revision;
  currentText: string;
  restoring: boolean;
  onRestore: () => void;
  onBack: () => void;
};

const KIND_LABEL: Record<Revision["kind"], string> = {
  translated: "Translated",
  variation: "Variation",
  edit: "Edit",
  restored: "Restored",
};

export function DiffView({ revision, currentText, restoring, onRestore, onBack }: Props) {
  const segments = React.useMemo(
    () => computeDiff(revision.translatedText, currentText),
    [revision.translatedText, currentText],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-ink/[0.06] px-10 py-3">
        <div className="flex items-baseline gap-3 text-[12px]">
          <span className="small-caps">Viewing</span>
          <span className="display italic">
            {revision.ts.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          <span className="text-muted-foreground">·</span>
          <span>{KIND_LABEL[revision.kind]}</span>
          {revision.modelId && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {revision.modelId}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRestore}
            disabled={restoring}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-foreground bg-foreground px-3 text-[12px] font-medium text-background shadow-[2px_2px_0_var(--ink)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--ink)] disabled:opacity-50"
          >
            {restoring ? "Restoring…" : "Restore this version"}
          </button>
          <button
            onClick={onBack}
            className="text-[12px] italic text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to current
          </button>
        </div>
      </div>

      {/* Diff body */}
      <div className="editor-surface min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-10 pt-7 pb-10">
        {segments.length === 0 ? (
          <p className="italic text-muted-foreground">No content in this revision.</p>
        ) : (
          segments.map((seg, i) => {
            if (seg.op === "equal") return <span key={i}>{seg.text}</span>;
            if (seg.op === "insert")
              return (
                <span key={i} className="rounded-sm bg-ink/15 px-0.5 text-foreground">
                  {seg.text}
                </span>
              );
            return (
              <span key={i} className="text-muted-foreground/60 line-through">
                {seg.text}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}
