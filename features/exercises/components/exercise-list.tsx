import { useDictionary } from "@/hooks/use-dictionary";
import type { Exercise } from "@/types";
import { ExerciseRow } from "./exercise-row";

export function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  const t = useDictionary();

  if (exercises.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">{t.exercises.empty}</p>
        <p className="text-xs text-muted-foreground">{t.exercises.emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {exercises.map((exercise) => (
        <ExerciseRow key={exercise.id} exercise={exercise} />
      ))}
    </div>
  );
}
