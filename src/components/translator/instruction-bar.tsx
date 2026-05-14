"use client";
import * as React from "react";
import { X, Plus, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_PRESETS, isDefaultPreset } from "@/lib/instruction-presets";
import type { UserPreset } from "@/lib/db/schema";

type Props = {
  value: string;
  onChange: (v: string) => void;
  presets: UserPreset[];
  onSavePreset: (preset: UserPreset) => void;
  onDeletePreset: (id: string) => void;
};

const MAX_NAME = 24;

export function InstructionBar({
  value,
  onChange,
  presets,
  onSavePreset,
  onDeletePreset,
}: Props) {
  const [savingName, setSavingName] = React.useState<string | null>(null);
  const saveInputRef = React.useRef<HTMLInputElement>(null);
  const saveOpen = savingName !== null;

  // The current textarea content matches one of the saved presets (default or
  // user). When true, the "Save" affordance is hidden — there's nothing new
  // to save.
  const allPresets = React.useMemo(
    () => [...DEFAULT_PRESETS, ...presets],
    [presets],
  );
  const trimmed = value.trim();
  const matchesExisting = React.useMemo(
    () => allPresets.some((p) => p.instruction === trimmed),
    [allPresets, trimmed],
  );

  // Select the default name only when save mode opens — not on every keystroke
  // (depending on `savingName` itself would re-select after each onChange and
  // wipe out the user's typed characters).
  React.useEffect(() => {
    if (saveOpen) saveInputRef.current?.select();
  }, [saveOpen]);

  const beginSave = () => {
    if (!trimmed) return;
    const defaultName = `Preset ${presets.length + 1}`;
    setSavingName(defaultName);
  };

  const commitSave = () => {
    if (savingName === null) return;
    const name = savingName.trim().slice(0, MAX_NAME) || `Preset ${presets.length + 1}`;
    const preset: UserPreset = {
      id: crypto.randomUUID(),
      name,
      instruction: trimmed,
      createdAt: Date.now(),
    };
    onSavePreset(preset);
    setSavingName(null);
  };

  const cancelSave = () => setSavingName(null);

  const onPresetClick = (preset: UserPreset) => onChange(preset.instruction);

  const onDelete = (preset: UserPreset) => {
    if (window.confirm(`Delete preset "${preset.name}"?`)) {
      onDeletePreset(preset.id);
    }
  };

  const activeId = React.useMemo(
    () => (trimmed ? allPresets.find((p) => p.instruction === trimmed)?.id ?? null : null),
    [allPresets, trimmed],
  );

  return (
    <div className="border-b border-hairline bg-[color-mix(in_oklch,var(--ink)_4%,var(--background))] px-6 py-3">
      <div className="flex flex-col gap-2">
        {/* Chip strip */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="small-caps shrink-0 mr-1">Presets</span>
          {DEFAULT_PRESETS.map((preset) => (
            <PresetChip
              key={preset.id}
              preset={preset}
              isDefault
              isActive={activeId === preset.id}
              onClick={() => onPresetClick(preset)}
            />
          ))}
          {presets.length > 0 && (
            <span aria-hidden className="mx-0.5 h-4 w-px bg-hairline" />
          )}
          {presets.map((preset) => (
            <PresetChip
              key={preset.id}
              preset={preset}
              isActive={activeId === preset.id}
              onClick={() => onPresetClick(preset)}
              onDelete={() => onDelete(preset)}
            />
          ))}
          {trimmed && !matchesExisting && savingName === null && (
            <button
              type="button"
              onClick={beginSave}
              className="ml-1 inline-flex items-center gap-1 rounded-sm border border-dashed border-foreground/40 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              title="Save current instruction as a preset"
            >
              <Plus className="h-3 w-3" />
              <span>Save</span>
            </button>
          )}
          {savingName !== null && (
            <div className="ml-1 inline-flex items-center gap-1.5">
              <Input
                ref={saveInputRef}
                value={savingName}
                onChange={(e) => setSavingName(e.target.value.slice(0, MAX_NAME))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitSave();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelSave();
                  }
                }}
                placeholder="Name this preset"
                className="h-7 w-40 px-2 text-[12px]"
              />
              <button
                type="button"
                onClick={commitSave}
                aria-label="Save preset"
                className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-foreground bg-foreground text-background transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={cancelSave}
                aria-label="Cancel"
                className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-hairline text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Textarea + clear */}
        <div className="relative">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder='e.g. "Use British spelling. Keep tone casual. Translate place names but keep proper nouns."'
            rows={2}
            className="min-h-[3.25rem] resize-none border-0 bg-transparent px-0 pr-7 py-1 text-[13px] italic shadow-none focus-visible:ring-0"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Clear instruction"
              className="absolute right-0 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PresetChip({
  preset,
  isDefault = false,
  isActive = false,
  onClick,
  onDelete,
}: {
  preset: UserPreset;
  isDefault?: boolean;
  isActive?: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <span
      className={cn(
        "group relative inline-flex items-center rounded-sm border border-hairline bg-background/60 text-[11px] transition-colors",
        isActive
          ? "border-foreground text-foreground shadow-[2px_2px_0_var(--ink)]"
          : "text-muted-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        title={preset.instruction}
        className={cn(
          "px-2 py-1",
          isDefault && "italic",
          onDelete ? "pr-2" : "",
        )}
      >
        {preset.name}
      </button>
      {onDelete && !isDefaultPreset(preset.id) && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete preset ${preset.name}`}
          className="hidden h-full items-center justify-center border-l border-hairline px-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:inline-flex"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
