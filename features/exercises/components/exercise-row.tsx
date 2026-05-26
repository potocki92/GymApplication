"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { CategoryBadge } from "@/components/shared/category-badge";
import { ExerciseIcon } from "@/components/shared/exercise-icon";
import { MuscleBadge } from "@/components/shared/muscle-badge";
import { useDictionary } from "@/hooks/use-dictionary";
import { bestPRForExercise, recentRecordsForExercise } from "@/lib/pr-utils";
import { useHistoryStore } from "@/store";
import type { Exercise } from "@/types";

export function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const t = useDictionary();
  const records = useHistoryStore((s) => s.records);
  const pr = bestPRForExercise(records, exercise.id);
  const last = recentRecordsForExercise(records, exercise.id, 1)[0];

  const lastLabel = last
    ? last.weightKg > 0
      ? `${last.weightKg} ${t.units.kg} × ${last.reps}`
      : `${last.reps} ${t.units.reps}`
    : `${exercise.defaultSets} × ${exercise.defaultReps}`;
  const lastPrefix = last ? t.exercises.last : t.exercises.defaults;

  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="relative flex items-stretch gap-4 rounded-2xl border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative size-[72px] shrink-0 overflow-hidden rounded-xl bg-muted">
        {exercise.image ? (
          <Image
            src={exercise.image}
            alt={exercise.name}
            fill
            sizes="72px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ExerciseIcon
              muscleGroup={exercise.muscleGroup}
              category={exercise.category}
              className="size-12 rounded-lg"
              iconClassName="size-6"
            />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 pr-10">
        <p className="line-clamp-1 text-base font-semibold leading-tight">
          {exercise.name}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <MuscleBadge group={exercise.muscleGroup} />
          <CategoryBadge category={exercise.category} />
        </div>
        <p className="text-xs text-muted-foreground">
          {lastPrefix}:{" "}
          <span className="font-medium tabular-nums text-primary">
            {lastLabel}
          </span>
        </p>
      </div>

      {pr ? (
        <span className="absolute right-3 top-3 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary-foreground">
          {t.exercises.pr}
        </span>
      ) : null}

      <ChevronRight className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
    </Link>
  );
}
