/** High-level state of a guided workout session (the FSM). */
export type SessionStatus =
  | "idle" // no session
  | "planning" // session built, not started yet
  | "executing" // a set is in progress (set timer running)
  | "resting" // rest countdown running between sets
  | "paused" // all clocks frozen
  | "finished"; // workout done, awaiting save/summary

export type SetStatus = "pending" | "active" | "completed" | "skipped";

/**
 * One performed set. Unlike the plan-time `WorkoutExercise` (which stores a rep
 * RANGE string and a single target weight), this records the ACTUAL integers the
 * user did. `actual*` fields double as the live "working" values while the set is
 * active, so they survive a reload mid-set.
 */
export interface LoggedSet {
  id: string;
  setNumber: number; // 1-based within its exercise
  status: SetStatus;
  targetReps: string; // copied from the plan, e.g. "8-12"
  targetWeightKg: number;
  actualReps: number | null;
  actualWeightKg: number | null;
  restTargetSec: number; // planned rest AFTER this set (editable mid-workout)
  startedAt: number | null; // epoch ms
  completedAt: number | null; // epoch ms
}

/** Execution-time snapshot of one `WorkoutExercise`. */
export interface ActiveExercise {
  id: string; // mirrors WorkoutExercise.id
  exerciseId: string; // FK into the exercise catalog
  order: number;
  targetReps: string;
  targetWeightKg: number;
  sets: LoggedSet[]; // length may drift from the plan (add/remove mid-workout)
}

/**
 * The full in-progress session. This is the blob serialized for crash recovery —
 * every time field is an ABSOLUTE epoch timestamp so elapsed time is recomputed
 * correctly after a reload (no durations are ever persisted).
 */
export interface ActiveSession {
  id: string;
  workoutId: string;
  workoutName: string;
  status: SessionStatus;
  startedAt: number | null; // first transition into "executing"
  finishedAt: number | null;
  pausedAt: number | null; // when the current pause began (null unless paused)
  currentExerciseIndex: number;
  currentSetIndex: number;
  restStartedAt: number | null; // anchor of the rest currently running
  restTargetSec: number; // target of the rest currently running
  exercises: ActiveExercise[];
  version: number; // schema version, for recovery migration
  updatedAt: number;
}

/** Emitted on finish — the input to history/PRs (Phase 2). */
export interface CompletedSession {
  id: string;
  workoutId: string;
  workoutName: string;
  startedAt: number;
  finishedAt: number;
  totalActiveMs: number;
  exercises: ActiveExercise[];
}

/** Bumped when `ActiveSession` shape changes incompatibly. */
export const SESSION_SCHEMA_VERSION = 1;
