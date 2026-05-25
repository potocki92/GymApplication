import { useDictionary } from "@/hooks/use-dictionary";
import { MUSCLE_BADGE_CLASSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MuscleGroup } from "@/types";

export function MuscleBadge({
  group,
  className,
}: {
  group: MuscleGroup;
  className?: string;
}) {
  const t = useDictionary();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        MUSCLE_BADGE_CLASSES[group],
        className,
      )}
    >
      {t.muscleGroups[group]}
    </span>
  );
}
