"use client";
import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-7 items-center gap-1.5 px-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Mode"
        >
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              mode === "simple" ? "bg-ink" : "bg-foreground/60",
            )}
          />
          <span className="capitalize">{mode}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[320px] p-0">
        <button
          onClick={() => onChange("simple")}
          className={cn(
            "relative block w-full border-b border-hairline px-4 py-3 text-left transition-colors",
            mode === "simple"
              ? "bg-ink/8"
              : "hover:bg-foreground/[0.04]",
          )}
        >
          {mode === "simple" && (
            <span aria-hidden className="absolute left-0 top-2 bottom-2 w-px bg-ink" />
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-[13.5px] font-medium">Simple</span>
            <span className="font-mono text-[10.5px] text-muted-foreground">
              Flash Lite
            </span>
          </div>
          <p className="mt-1 text-[12px] italic leading-snug text-muted-foreground">
            Sensible defaults. Gemini 3.1 Flash Lite handles every translation —
            cheapest, fastest, and still fluent across long documents.
          </p>
        </button>
        <button
          onClick={() => onChange("advanced")}
          className={cn(
            "relative block w-full px-4 py-3 text-left transition-colors",
            mode === "advanced"
              ? "bg-ink/8"
              : "hover:bg-foreground/[0.04]",
          )}
        >
          {mode === "advanced" && (
            <span aria-hidden className="absolute left-0 top-2 bottom-2 w-px bg-ink" />
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-[13.5px] font-medium">Advanced</span>
            <span className="font-mono text-[10.5px] text-muted-foreground">
              choose model
            </span>
          </div>
          <p className="mt-1 text-[12px] italic leading-snug text-muted-foreground">
            Pick any model — Gemini 3.1 Pro for nuance, Claude for literary
            voice, GPT-5 for technical prose.
          </p>
        </button>
      </PopoverContent>
    </Popover>
  );
}
