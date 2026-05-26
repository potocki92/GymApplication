import type { CompletedSession, ExerciseHistoryRecord } from "@/types";

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

export interface NewPR {
  exerciseId: string;
  newOneRMKg: number;
  previousOneRMKg: number; // 0 when there is no prior history
  setReps: number;
  setWeightKg: number;
}

/**
 * For each exercise in the finished session, check whether any of its completed
 * sets produced an estimated 1RM higher than anything in `priorHistory`. Returns
 * one entry per exercise that set a new record. `priorHistory` must NOT include
 * records from this session (filter by `sessionId` upstream).
 */
export function detectNewPRs(
  session: CompletedSession,
  priorHistory: ExerciseHistoryRecord[],
): NewPR[] {
  const prevBest = new Map<string, number>();
  for (const r of priorHistory) {
    const cur = prevBest.get(r.exerciseId) ?? 0;
    if (r.oneRMKg > cur) prevBest.set(r.exerciseId, r.oneRMKg);
  }

  const out: NewPR[] = [];
  for (const ex of session.exercises) {
    let bestOneRM = 0;
    let bestReps = 0;
    let bestWeight = 0;
    for (const s of ex.sets) {
      if (s.status !== "completed") continue;
      const reps = s.actualReps ?? 0;
      const weight = s.actualWeightKg ?? 0;
      if (reps <= 0 || weight <= 0) continue;
      const oneRM = calculate1RM(weight, reps);
      if (oneRM > bestOneRM) {
        bestOneRM = oneRM;
        bestReps = reps;
        bestWeight = weight;
      }
    }
    const prev = prevBest.get(ex.exerciseId) ?? 0;
    if (bestOneRM > 0 && bestOneRM > prev) {
      out.push({
        exerciseId: ex.exerciseId,
        newOneRMKg: bestOneRM,
        previousOneRMKg: prev,
        setReps: bestReps,
        setWeightKg: bestWeight,
      });
    }
  }
  return out;
}
