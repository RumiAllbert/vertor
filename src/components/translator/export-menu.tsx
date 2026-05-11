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

type ExportFormat = "docx" | "pdf" | "tex" | "txt" | "md";
type ExportMode = "translation" | "side-by-side";

const ITEMS: { format: ExportFormat; label: string }[] = [
  { format: "docx", label: "Word" },
  { format: "pdf", label: "PDF" },
  { format: "tex", label: "LaTeX" },
  { format: "md", label: "Markdown" },
  { format: "txt", label: "Plain text" },
];

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
  const handle = async (format: ExportFormat, mode: ExportMode) => {
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
    const m = /filename="([^"]+)"/.exec(cd);
    a.download = m?.[1] ?? `${title}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className="inline-flex h-8 items-center text-[12px] tracking-tight text-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
      >
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="small-caps !text-[10px]">Translation</DropdownMenuLabel>
        {ITEMS.map((it) => (
          <DropdownMenuItem
            key={`t-${it.format}`}
            onSelect={() => handle(it.format, "translation")}
            className="justify-between text-[13px]"
          >
            <span>{it.label}</span>
            <span className="font-mono text-[10.5px] text-muted-foreground">.{it.format}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="small-caps !text-[10px]">Side by side</DropdownMenuLabel>
        {ITEMS.map((it) => (
          <DropdownMenuItem
            key={`s-${it.format}`}
            onSelect={() => handle(it.format, "side-by-side")}
            className="justify-between text-[13px]"
          >
            <span>{it.label}</span>
            <span className="font-mono text-[10.5px] text-muted-foreground">.{it.format}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
