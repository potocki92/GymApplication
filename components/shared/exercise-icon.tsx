import Image from "next/image";
import { Activity, Dumbbell } from "lucide-react";

import { MUSCLE_BADGE_CLASSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ExerciseCategory, MuscleGroup } from "@/types";

export function ExerciseIcon({
  muscleGroup,
  category,
  image,
  name,
  className,
  iconClassName,
}: {
  muscleGroup: MuscleGroup;
  category?: ExerciseCategory;
  image?: string;
  name?: string;
  className?: string;
  iconClassName?: string;
}) {
  if (image) {
    return (
      <span
        className={cn(
          "relative flex size-10 shrink-0 overflow-hidden rounded-xl bg-muted",
          className,
        )}
      >
        <Image
          src={image}
          alt={name ?? ""}
          fill
          sizes="40px"
          className="object-cover"
        />
      </span>
    );
  }

  const Icon =
    category === "cardio" || muscleGroup === "cardio" ? Activity : Dumbbell;
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
