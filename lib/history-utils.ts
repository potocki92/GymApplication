import { calculate1RM } from "./pr-utils";
import type { CompletedSession, ExerciseHistoryRecord } from "@/types";

/**
 * Flattens a finished session into the long-term history record per completed set.
 * Bodyweight sets (weight 0) are still recorded for the exercise's history; only
 * sets with zero reps are dropped because they carry no information.
 */
export function completedSessionToHistoryRecords(
  completed: CompletedSession,
): ExerciseHistoryRecord[] {
  const out: ExerciseHistoryRecord[] = [];
  for (const ex of completed.exercises) {
    for (const set of ex.sets) {
      if (set.status !== "completed") continue;
      const reps = set.actualReps ?? 0;
      const weightKg = set.actualWeightKg ?? 0;
      if (reps <= 0) continue;
      out.push({
        id: set.id,
        exerciseId: ex.exerciseId,
        workoutId: completed.workoutId,
        sessionId: completed.id,
        setNumber: set.setNumber,
        reps,
        weightKg,
        oneRMKg: calculate1RM(weightKg, reps),
        completedAt: set.completedAt ?? completed.finishedAt,
      });
    }
  }
  return out;
}
