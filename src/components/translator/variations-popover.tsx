"use client";
import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { VariationKind } from "@/lib/prompts";

type Props = {
  open: boolean;
  anchor: { top: number; left: number } | null;
  selection: string;
  kind: VariationKind;
  sourceContext: string;
  translationContext: string;
  sourceLang: string;
  targetLang: string;
  modelId: string;
  onOpenChange: (open: boolean) => void;
  onApply: (replacement: string) => void;
  onApplyToWhole: (instruction: string) => void;
};

export function VariationsPopover(props: Props) {
  const {
    open, anchor, selection, kind, sourceContext, translationContext,
    sourceLang, targetLang, modelId, onOpenChange, onApply, onApplyToWhole,
  } = props;

  const [variations, setVariations] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [instruction, setInstruction] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setVariations([]);
      setError(null);
    }
  }, [open, selection]);

  const fetchVariations = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection, sourceContext, translationContext,
          sourceLang, targetLang, modelId, kind, instruction,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { variations: string[] };
      setVariations(data.variations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [selection, sourceContext, translationContext, sourceLang, targetLang, modelId, kind, instruction]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          aria-hidden
          tabIndex={-1}
          className="pointer-events-none fixed h-0 w-0"
          style={anchor ? { top: anchor.top, left: anchor.left } : undefined}
        />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={10}
        className="w-[440px] overflow-hidden border-hairline p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-baseline justify-between gap-3 border-b border-hairline px-4 py-2.5">
          <span className="small-caps">{kind}</span>
          <span className="truncate font-serif text-[13px] italic text-muted-foreground">
            “{selection.length > 60 ? selection.slice(0, 57) + "…" : selection}”
          </span>
        </div>

        <div className="space-y-3 px-4 py-3">
          <Textarea
            placeholder={`Optional — how should this ${kind} change? e.g. "shorter", "more formal", "use plainer diction"`}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={2}
            className="resize-none border-0 border-b border-hairline rounded-none bg-transparent px-0 text-[12px] italic shadow-none focus-visible:ring-0 focus-visible:border-foreground"
          />
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={fetchVariations}
              disabled={loading}
              className="inline-flex items-center gap-2 text-[12px] text-foreground transition-colors hover:text-ink disabled:opacity-50"
            >
              <span className="font-mono text-[11px]">{loading ? "…" : "→"}</span>
              {variations.length ? "Regenerate" : "Suggest three"}
            </button>
            {kind !== "document" && instruction.trim() && (
              <button
                onClick={() => onApplyToWhole(instruction)}
                className="text-[11px] italic text-muted-foreground underline decoration-hairline underline-offset-[6px] transition-colors hover:text-ink"
                title="Apply this instruction to the whole document"
              >
                apply across the whole doc
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="border-t border-hairline px-4 py-2 text-[11px] italic text-destructive">
            {error}
          </div>
        )}

        {variations.length > 0 && (
          <div className="border-t border-hairline">
            {variations.map((v, i) => (
              <button
                key={i}
                onClick={() => onApply(v)}
                className={cn(
                  "group block w-full px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_oklch,var(--ink)_6%,transparent)]",
                  i > 0 && "border-t border-hairline",
                )}
              >
                <div className="flex items-baseline gap-2 text-[10.5px] text-muted-foreground">
                  <span className="font-mono">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-mono opacity-50 transition-opacity group-hover:opacity-100">↵</span>
                </div>
                <div className="mt-1 font-serif text-[14px] leading-snug">{v}</div>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
