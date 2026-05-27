/**
 * Session-level history record (one per completed workout). The per-set rows in
 * exercise_history reference the same sessionId; this header carries metadata
 * the user picked from the summary screen plus pre-aggregated counters so the
 * /history list doesn't have to scan exercise_history on every render.
 */
export interface SessionHistoryRecord {
  id: string;
  workoutId: string;
  workoutName: string;
  /** Epoch milliseconds. */
  startedAt: number;
  finishedAt: number;
  totalActiveMs: number;
  totalVolumeKg: number;
  exercisesCount: number;
  setsCompleted: number;
  repsCompleted: number;
  /** 1-5 stars, set in the summary screen. */
  rating?: number;
  /** Free-form note from the summary screen. */
  note?: string;
  avgHrBpm?: number;
  maxHrBpm?: number;
}

export const SESSION_HISTORY_SCHEMA_VERSION = 1;
