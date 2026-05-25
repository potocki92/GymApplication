import { Activity, Dumbbell } from "lucide-react";

import { MUSCLE_BADGE_CLASSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ExerciseCategory, MuscleGroup } from "@/types";

export function ExerciseIcon({
  muscleGroup,
  category,
  className,
  iconClassName,
}: {
  muscleGroup: MuscleGroup;
  category?: ExerciseCategory;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = category === "cardio" || muscleGroup === "cardio" ? Activity : Dumbbell;
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        MUSCLE_BADGE_CLASSES[muscleGroup],
        className,
      )}
    >
      <Icon className={cn("size-5", iconClassName)} />
    </span>
  );
}
