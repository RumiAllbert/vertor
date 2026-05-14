"use client";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { languageName } from "@/lib/languages";

type ExportFormat = "docx" | "pdf" | "tex" | "txt" | "md";
type ExportMode = "translation" | "side-by-side";

const ITEMS: { format: ExportFormat; label: string; hint: string }[] = [
  { format: "pdf", label: "PDF", hint: "for sharing" },
  { format: "docx", label: "Word", hint: "for editing" },
  { format: "md", label: "Markdown", hint: "for writing" },
  { format: "tex", label: "LaTeX", hint: "for typesetting" },
  { format: "txt", label: "Plain text", hint: "raw" },
];

// Parse RFC 5987 + plain filename from a Content-Disposition header. Prefers
// the UTF-8 form so titles in non-Latin scripts come through intact.
function parseFilename(cd: string): string | null {
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      /* fall through */
    }
  }
  const ascii = /filename="([^"]+)"/.exec(cd);
  return ascii?.[1] ?? null;
}

export function ExportMenu({
  title,
  source,
  translation,
  sourceLang,
  targetLang,
  disabled,
}: {
  title: string;
  source: string;
  translation: string;
  sourceLang: string;
  targetLang: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const handle = async (format: ExportFormat, mode: ExportMode) => {
    if (busy) return;
    const key = `${format}:${mode}`;
    setBusy(key);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, title, source, translation, sourceLang, targetLang, mode }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      a.download = parseFilename(cd) ?? `${title || "untitled"}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  };

  const langPair =
    sourceLang && targetLang
      ? `${languageName(sourceLang)} → ${languageName(targetLang)}`
      : targetLang
        ? languageName(targetLang)
        : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className="inline-flex h-8 items-center text-[12px] tracking-tight text-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
      >
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[18rem]">
        {langPair && (
          <>
            <div className="px-2 py-1.5">
              <p className="display text-[11px] italic leading-tight text-muted-foreground">
                {langPair}
              </p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel className="small-caps !text-[10px]">
          Translation only
        </DropdownMenuLabel>
        {ITEMS.map((it) => {
          const key = `${it.format}:translation`;
          return (
            <DropdownMenuItem
              key={`t-${it.format}`}
              onSelect={(e) => {
                e.preventDefault();
                handle(it.format, "translation");
              }}
              disabled={busy !== null}
              className="flex items-baseline justify-between gap-3 text-[13px]"
            >
              <span className="flex items-baseline gap-2">
                <span>{it.label}</span>
                <span className="text-[10.5px] italic text-muted-foreground">
                  {busy === key ? "preparing…" : it.hint}
                </span>
              </span>
              <span className="font-mono text-[10.5px] text-muted-foreground">
                .{it.format}
              </span>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="small-caps !text-[10px]">
          Bilingual · side-by-side
        </DropdownMenuLabel>
        {ITEMS.map((it) => {
          const key = `${it.format}:side-by-side`;
          return (
            <DropdownMenuItem
              key={`s-${it.format}`}
              onSelect={(e) => {
                e.preventDefault();
                handle(it.format, "side-by-side");
              }}
              disabled={busy !== null}
              className="flex items-baseline justify-between gap-3 text-[13px]"
            >
              <span className="flex items-baseline gap-2">
                <span>{it.label}</span>
                <span className="text-[10.5px] italic text-muted-foreground">
                  {busy === key ? "preparing…" : it.hint}
                </span>
              </span>
              <span className="font-mono text-[10.5px] text-muted-foreground">
                .{it.format}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
