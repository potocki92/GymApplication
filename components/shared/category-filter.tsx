"use client";

import { ChipFilter } from "@/components/shared/chip-filter";
import { useDictionary } from "@/hooks/use-dictionary";
import { EXERCISE_CATEGORY_ORDER } from "@/lib/constants";
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

  const options = [
    { value: "all" as const, label: t.common.all },
    ...EXERCISE_CATEGORY_ORDER.map((category) => ({
      value: category,
      label: t.categories[category],
    })),
  ];

  return (
    <ChipFilter
      value={value}
      onChange={onChange}
      options={options}
      aria-label={t.exercises.filters.category}
      className={className}
    />
  );
}
