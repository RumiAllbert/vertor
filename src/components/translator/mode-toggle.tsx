"use client";
import * as React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type Mode = "simple" | "advanced";

const KEY = "vertor.mode.v1";

export function useMode(): [Mode, (m: Mode) => void] {
  const [mode, setMode] = React.useState<Mode>("simple");
  React.useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "advanced" || v === "simple") setMode(v);
    } catch {}
  }, []);
  const set = React.useCallback((m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {}
  }, []);
  return [mode, set];
}

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Model mode"
      className="inline-flex h-7 items-center rounded-sm border border-hairline bg-background p-0.5 text-[11.5px]"
    >
      <SegmentButton
        active={mode === "simple"}
        onClick={() => onChange("simple")}
      >
        Simple
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="ml-1 inline-flex h-3 w-3 items-center justify-center text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Info className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-[11px] leading-snug italic">
            Smart default. Gemini 3.1 Flash Lite — cheapest, fastest, fluent across long documents. Switch to Advanced to choose any model.
          </TooltipContent>
        </Tooltip>
      </SegmentButton>
      <SegmentButton
        active={mode === "advanced"}
        onClick={() => onChange("advanced")}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span>Advanced</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-[11px] leading-snug italic">
            Pick any model — Gemini 3.1 Pro for nuance, Claude for literary voice, GPT-5 for technical prose.
          </TooltipContent>
        </Tooltip>
      </SegmentButton>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-6 items-center gap-0.5 rounded-[3px] px-2.5 transition-colors",
        active
          ? "bg-ink/10 text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
