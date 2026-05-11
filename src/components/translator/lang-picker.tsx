"use client";
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, TRANSLATABLE_LANGUAGES, languageName } from "@/lib/languages";

export function LangPicker({
  value,
  onChange,
  includeAuto = false,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (code: string) => void;
  includeAuto?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const list = includeAuto ? LANGUAGES : TRANSLATABLE_LANGUAGES;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label={ariaLabel ?? "Language"}>
        <SelectValue>
          <span className="text-[12px]">{languageName(value)}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {list.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            <div className="flex items-baseline gap-2 py-0.5">
              <span className="text-[13px]">{l.name}</span>
              {l.code !== "auto" && (
                <span className="text-[11px] italic text-muted-foreground">{l.native}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
