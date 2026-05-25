import { ExerciseIcon } from "@/components/shared/exercise-icon";
import { MuscleBadge } from "@/components/shared/muscle-badge";
import { useDictionary } from "@/hooks/use-dictionary";
import type { Exercise } from "@/types";

export function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const t = useDictionary();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-sm">
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
        <p className="text-xs text-muted-foreground">{t.exercises.defaults}</p>
        <p className="text-sm font-medium tabular-nums">
          {exercise.defaultSets} × {exercise.defaultReps}
        </p>
      </div>
    </div>
  );
}
