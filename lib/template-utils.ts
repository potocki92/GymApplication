import type { Workout, WorkoutTemplate } from "@/types";

import { estimateWorkoutDuration, reindexExercises } from "./workout-utils";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** Tworzy szablon z istniejącego treningu (kopiuje ćwiczenia, odpina od dnia). */
export function workoutToTemplate(workout: Workout): WorkoutTemplate {
  const exercises = reindexExercises(workout.exercises.map((e) => ({ ...e })));
  return {
    id: uid(),
    name: workout.name,
    type: workout.type,
    exercises,
    estimatedDurationMin:
      workout.estimatedDurationMin || estimateWorkoutDuration(exercises),
    createdAt: Date.now(),
    usageCount: 0,
  };
}

/**
 * Klonuje szablon do świeżego `Workout` gotowego do dodania do planu — nowe
 * `id` treningu oraz nowe instance-id ćwiczeń, żeby nie kolidowały z innymi.
 */
export function templateToWorkout(template: WorkoutTemplate): Workout {
  const workoutId = `w-${uid()}`;
  const exercises = reindexExercises(
    template.exercises.map((e) => ({ ...e, id: uid() })),
  );
  return {
    id: workoutId,
    name: template.name,
    type: template.type,
    exercises,
    estimatedDurationMin:
      template.estimatedDurationMin || estimateWorkoutDuration(exercises),
    completed: false,
  };
}
