"use client";

import { ToggleChip } from "@/components/ui/toggle-chip";
import { cn } from "@/lib/utils";

export interface ChipFilterOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Horizontal row of single-select chips. The shared base for every "narrow this
 * list by one facet" control (muscle group, category, pose, status) so they all
 * use the same capsule, spacing and active treatment.
 *
 * For two-to-four mutually exclusive *views*, prefer `SegmentedControl`.
 */
export function ChipFilter<T extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly ChipFilterOption<T>[];
  "aria-label": string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("no-scrollbar flex gap-2 overflow-x-auto pb-1", className)}
    >
      {options.map((option) => (
        <ToggleChip
          key={option.value}
          size="sm"
          className="shrink-0"
          selected={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </ToggleChip>
      ))}
    </div>
  );
}
