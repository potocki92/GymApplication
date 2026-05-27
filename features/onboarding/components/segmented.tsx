"use client";

import { cn } from "@/lib/utils";
import type { OptionDef } from "@/lib/profile/options";

interface SegmentedProps<T extends string> {
  options: OptionDef<T>[];
  value: T | null;
  onChange: (next: T) => void;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-10 rounded-md border text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
