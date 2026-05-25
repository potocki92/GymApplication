"use client";

import { useDictionary } from "@/hooks/use-dictionary";
import { MUSCLE_GROUP_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MuscleGroup } from "@/types";

export type MuscleFilterValue = MuscleGroup | "all";

export function MuscleFilter({
  value,
  onChange,
  className,
}: {
  value: MuscleFilterValue;
  onChange: (value: MuscleFilterValue) => void;
  className?: string;
}) {
  const t = useDictionary();
  const options: MuscleFilterValue[] = ["all", ...MUSCLE_GROUP_ORDER];

  return (
    <div className={cn("no-scrollbar flex gap-2 overflow-x-auto pb-1", className)}>
      {options.map((opt) => {
        const active = value === opt;
        const label = opt === "all" ? t.common.all : t.muscleGroups[opt];
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
