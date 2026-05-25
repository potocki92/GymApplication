"use client";

import { Trash2 } from "lucide-react";

import { ExerciseIcon } from "@/components/shared/exercise-icon";
import { MuscleBadge } from "@/components/shared/muscle-badge";
import { Button } from "@/components/ui/button";
import { getExerciseById } from "@/data";
import { useWorkoutDraftStore } from "@/store";
import type { WorkoutExercise } from "@/types";
import { ExerciseConfigPanel } from "./exercise-config-panel";

export function SelectedExerciseRow({
  workoutExercise,
}: {
  workoutExercise: WorkoutExercise;
}) {
  const updateExercise = useWorkoutDraftStore((s) => s.updateExercise);
  const removeExercise = useWorkoutDraftStore((s) => s.removeExercise);

  const exercise = getExerciseById(workoutExercise.exerciseId);
  if (!exercise) return null;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <ExerciseIcon muscleGroup={exercise.muscleGroup} category={exercise.category} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-medium">{exercise.name}</p>
          <MuscleBadge group={exercise.muscleGroup} className="mt-1" />
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Usuń ćwiczenie"
          onClick={() => removeExercise(workoutExercise.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <ExerciseConfigPanel
        value={workoutExercise}
        onChange={(patch) => updateExercise(workoutExercise.id, patch)}
      />
    </div>
  );
}
