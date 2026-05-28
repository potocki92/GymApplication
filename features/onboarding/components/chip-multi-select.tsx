"use client";

import type { ComponentType, SVGProps } from "react";

import { ToggleChip } from "@/components/ui/toggle-chip";
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
          <ToggleChip
            key={opt.value}
            selected={selected}
            onClick={() => toggle(opt.value)}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            {opt.label}
          </ToggleChip>
        );
      })}
    </div>
  );
}
