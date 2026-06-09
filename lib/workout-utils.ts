import type { Workout, WorkoutExercise } from "@/types";

/** Average of a rep range string, e.g. "8-12" -> 10, "15" -> 15. */
export function averageReps(reps: string): number {
  const parts = reps.split("-").map((p) => Number.parseInt(p.trim(), 10));
  const valid = parts.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** Estimated total volume (sets x avg reps x weight) in kg. */
export function getWorkoutVolume(workout: Workout): number {
  return workout.exercises.reduce(
    (total, ex) => total + ex.sets * averageReps(ex.reps) * ex.weightKg,
    0,
  );
}

export function getExerciseCount(workout: Workout): number {
  return workout.exercises.length;
}

/** Stable id for a workout exercise instance. */
export function makeWorkoutExerciseId(workoutId: string, order: number): string {
  return `${workoutId}-ex-${order}`;
}

export function reindexExercises(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return exercises.map((ex, i) => ({ ...ex, order: i }));
}

/** Rough session-length estimate (minutes) from sets, reps and rest. */
export function estimateWorkoutDuration(exercises: WorkoutExercise[]): number {
  const seconds = exercises.reduce(
    (total, ex) => total + ex.sets * (averageReps(ex.reps) * 4 + ex.restSec),
    0,
  );
  return Math.max(0, Math.round(seconds / 60));
}
