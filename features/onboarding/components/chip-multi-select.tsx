"use client";

import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";
import type { OptionDef } from "@/lib/profile/options";

interface ChipMultiSelectProps<T extends string> {
  options: OptionDef<T>[];
  value: T[];
  onChange: (next: T[]) => void;
}

export function ChipMultiSelect<T extends string>({
  options,
  value,
  onChange,
}: ChipMultiSelectProps<T>) {
  const toggle = (v: T) => {
    const has = value.includes(v);
    onChange(has ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const Icon = opt.icon as
          | ComponentType<SVGProps<SVGSVGElement>>
          | undefined;
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role="checkbox"
            aria-checked={selected}
            onClick={() => toggle(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
