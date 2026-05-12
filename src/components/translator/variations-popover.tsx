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
  // When loading because of a "more like this" click, remember which row
  // triggered it so we can show a subtle inline state there.
  const [basedOnIndex, setBasedOnIndex] = React.useState<number | null>(null);
  const [instruction, setInstruction] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setVariations([]);
      setError(null);
      setBasedOnIndex(null);
    }
  }, [open, selection]);

  const fetchVariations = React.useCallback(
    async (basedOn?: string, basedIdx?: number) => {
      setLoading(true);
      setBasedOnIndex(basedIdx ?? null);
      setError(null);
      try {
        const res = await fetch("/api/variations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selection, sourceContext, translationContext,
            sourceLang, targetLang, modelId, kind, instruction,
            ...(basedOn ? { basedOn } : {}),
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
        setBasedOnIndex(null);
      }
    },
    [selection, sourceContext, translationContext, sourceLang, targetLang, modelId, kind, instruction],
  );

  // "More like this" is only meaningful for phrase/paragraph/document.
  // For a single word, variants are inherently different word choices —
  // there's not much "style" to base further variations on.
  const canSimilars = kind !== "word";

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
        className="w-[460px] overflow-hidden border-hairline p-0"
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
              onClick={() => fetchVariations()}
              disabled={loading}
              className="inline-flex items-center gap-2 text-[12px] text-foreground transition-colors hover:text-ink disabled:opacity-50"
            >
              <span className="font-mono text-[11px]">{loading && basedOnIndex === null ? "…" : "→"}</span>
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
            {variations.map((v, i) => {
              const isSourceOfSimilars = loading && basedOnIndex === i;
              return (
                <div
                  key={i}
                  className={cn(
                    "group relative w-full px-4 py-3 transition-colors",
                    i > 0 && "border-t border-hairline",
                    isSourceOfSimilars
                      ? "bg-ink/[0.06]"
                      : "hover:bg-[color-mix(in_oklch,var(--ink)_5%,transparent)]",
                  )}
                >
                  {/* Primary action — click anywhere on the body to apply */}
                  <button
                    type="button"
                    onClick={() => onApply(v)}
                    disabled={loading}
                    className="block w-full text-left disabled:cursor-not-allowed"
                  >
                    <div className="flex items-baseline gap-2 text-[10.5px] text-muted-foreground">
                      <span className="font-mono">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-mono opacity-50 transition-opacity group-hover:opacity-100">↵</span>
                    </div>
                    <div className="mt-1 pr-20 font-serif text-[14px] leading-snug">{v}</div>
                  </button>

                  {/* Secondary action — "more like this", iterates on this variation's tone.
                      Only shown for phrase/paragraph/document; word-level variations don't
                      have meaningful "style" to base further suggestions on. */}
                  {canSimilars && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchVariations(v, i);
                      }}
                      disabled={loading}
                      className={cn(
                        "absolute right-3 top-3 text-[10px] italic text-muted-foreground transition-colors",
                        "hover:text-ink disabled:cursor-not-allowed disabled:opacity-50",
                      )}
                      title="Generate three more in this register"
                    >
                      {isSourceOfSimilars ? (
                        <span className="font-mono">…</span>
                      ) : (
                        <>
                          <span className="font-mono opacity-60">↺</span> more like this
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
