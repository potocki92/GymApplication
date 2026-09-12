"use client";

import { ChipFilter } from "@/components/shared/chip-filter";
import { useDictionary } from "@/hooks/use-dictionary";
import { MUSCLE_GROUP_ORDER } from "@/lib/constants";
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

  const options = [
    { value: "all" as const, label: t.common.all },
    ...MUSCLE_GROUP_ORDER.map((group) => ({
      value: group,
      label: t.muscleGroups[group],
    })),
  ];

  return (
    <ChipFilter
      value={value}
      onChange={onChange}
      options={options}
      aria-label={t.exercises.filters.muscleGroup}
      className={className}
    />
  );
}
