import type { ExerciseHistoryRecord } from "@/types";

/**
 * Estimated one-rep max via the Brzycki formula: `weight × 36 / (37 - reps)`.
 * Reps are capped at 12 — Brzycki loses accuracy at high rep counts, and clamping
 * prevents the divisor from running away. Returns 0 for non-positive inputs.
 * Result is rounded to one decimal.
 */
export function calculate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(weightKg * 10) / 10;
  const r = Math.min(reps, 12);
  const oneRM = (weightKg * 36) / (37 - r);
  return Math.round(oneRM * 10) / 10;
}

export interface PRSummary {
  exerciseId: string;
  bestRecord: ExerciseHistoryRecord;
}

/** Highest-1RM record for one exercise, or null when no history exists. */
export function bestPRForExercise(
  records: ExerciseHistoryRecord[],
  exerciseId: string,
): ExerciseHistoryRecord | null {
  let best: ExerciseHistoryRecord | null = null;
  for (const r of records) {
    if (r.exerciseId !== exerciseId) continue;
    if (best == null || r.oneRMKg > best.oneRMKg) best = r;
  }
  return best;
}

/**
 * Top N exercises by their estimated 1RM, ranked descending. One entry per
 * exercise (the best record for that exercise wins its slot).
 */
export function topPRs(
  records: ExerciseHistoryRecord[],
  limit: number,
): PRSummary[] {
  const bestPerExercise = new Map<string, ExerciseHistoryRecord>();
  for (const r of records) {
    const cur = bestPerExercise.get(r.exerciseId);
    if (cur == null || r.oneRMKg > cur.oneRMKg) {
      bestPerExercise.set(r.exerciseId, r);
    }
  }
  return [...bestPerExercise.values()]
    .sort((a, b) => b.oneRMKg - a.oneRMKg)
    .slice(0, limit)
    .map((bestRecord) => ({ exerciseId: bestRecord.exerciseId, bestRecord }));
}

/** Most recent N records for one exercise, newest first. */
export function recentRecordsForExercise(
  records: ExerciseHistoryRecord[],
  exerciseId: string,
  limit: number,
): ExerciseHistoryRecord[] {
  return records
    .filter((r) => r.exerciseId === exerciseId)
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, limit);
}
