/**
 * One performed set recorded in long-term history. Created on session save from a
 * completed `LoggedSet`. `oneRMKg` is precomputed (via Brzycki, see `lib/pr-utils`)
 * so PR queries don't have to recompute it on every read.
 */
export interface ExerciseHistoryRecord {
  id: string;
  exerciseId: string;
  workoutId: string;
  sessionId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  oneRMKg: number;
  /** Epoch milliseconds — when the set was completed. */
  completedAt: number;
  /** Rate of Perceived Exertion 1-10 captured during the set. */
  rpe?: number;
  /** Optional free-form notes the user recorded with the set. */
  notes?: string;
}

/** Bumped when `ExerciseHistoryRecord` shape changes incompatibly. */
export const HISTORY_SCHEMA_VERSION = 1;
