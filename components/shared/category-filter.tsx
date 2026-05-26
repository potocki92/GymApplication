"use client";

import { useDictionary } from "@/hooks/use-dictionary";
import { EXERCISE_CATEGORY_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ExerciseCategory } from "@/types";

export type CategoryFilterValue = ExerciseCategory | "all";

export function CategoryFilter({
  value,
  onChange,
  className,
}: {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
  className?: string;
}) {
  const t = useDictionary();
  const options: CategoryFilterValue[] = ["all", ...EXERCISE_CATEGORY_ORDER];

  return (
    <div className={cn("no-scrollbar flex gap-2 overflow-x-auto pb-1", className)}>
      {options.map((opt) => {
        const active = value === opt;
        const label = opt === "all" ? t.common.all : t.categories[opt];
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-accent text-accent-foreground"
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
