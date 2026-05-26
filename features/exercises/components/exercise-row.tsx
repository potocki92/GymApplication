"use client";

import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";

import { ExerciseIcon } from "@/components/shared/exercise-icon";
import { MuscleBadge } from "@/components/shared/muscle-badge";
import { useDictionary } from "@/hooks/use-dictionary";
import { bestPRForExercise } from "@/lib/pr-utils";
import { useHistoryStore } from "@/store";
import type { Exercise } from "@/types";

export function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const t = useDictionary();
  const records = useHistoryStore((s) => s.records);
  const pr = bestPRForExercise(records, exercise.id);

  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ExerciseIcon muscleGroup={exercise.muscleGroup} category={exercise.category} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium">{exercise.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <MuscleBadge group={exercise.muscleGroup} />
          <span className="text-xs text-muted-foreground">
            {t.categories[exercise.category]}
          </span>
        </div>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        {pr ? (
          <>
            <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <Trophy className="size-3 text-primary" />
              {t.exercises.pr}
            </p>
            <p className="text-sm font-medium tabular-nums">
              {pr.weightKg} {t.units.kg} × {pr.reps}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{t.exercises.defaults}</p>
            <p className="text-sm font-medium tabular-nums">
              {exercise.defaultSets} × {exercise.defaultReps}
            </p>
          </>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
