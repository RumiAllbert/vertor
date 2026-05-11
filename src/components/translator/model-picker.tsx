"use client";
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODELS_BY_PROVIDER, PROVIDER_LABEL, getModel } from "@/lib/models";

export function ModelPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const m = getModel(value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label="Model">
        <SelectValue placeholder="Model">
          <span className="truncate text-[12px]">{m.label}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(["google", "anthropic", "openai"] as const).map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel className="small-caps !text-[10px]">{PROVIDER_LABEL[p]}</SelectLabel>
              {MODELS_BY_PROVIDER[p].map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  <div className="flex flex-col py-0.5">
                    <span className="text-[13px]">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[11px] italic text-muted-foreground">
                        {opt.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </React.Fragment>
        ))}
      </SelectContent>
    </Select>
  );
}
