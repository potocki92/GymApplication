export type WorkoutSessionStatus = "active" | "paused" | "completed" | "abandoned";

export type WorkoutSessionSetStatus =
  | "started"
  | "completed"
  | "deleted";

export interface WorkoutSessionSet {
  exerciseId: string;
  setIndex: number;
  reps: number;
  weightKg: number;
  rpe: number | null;
  notes: string | null;
  startedAt: number | null;
  completedAt: number | null;
  status: WorkoutSessionSetStatus;
}

export interface WorkoutSessionRestTimer {
  status: "idle" | "active" | "finished" | "skipped";
  startedAt: number | null;
  finishedAt: number | null;
  durationSec: number;
  exerciseId: string | null;
  setIndex: number | null;
}

export interface WorkoutSessionNote {
  id: string;
  note: string;
  createdAt: number;
  exerciseId?: string;
  setIndex?: number;
}

export interface WorkoutSessionState {
  sessionId: string;
  workoutId: string;
  workoutName: string;
  status: WorkoutSessionStatus;
  startedAt: number;
  finishedAt: number | null;
  totalPausedMs: number;
  pausedAt: number | null;
  currentExerciseId: string | null;
  currentExerciseIndex: number | null;
  sets: WorkoutSessionSet[];
  restTimer: WorkoutSessionRestTimer;
  notes: WorkoutSessionNote[];
}

export const EMPTY_REST_TIMER: WorkoutSessionRestTimer = {
  status: "idle",
  startedAt: null,
  finishedAt: null,
  durationSec: 0,
  exerciseId: null,
  setIndex: null,
};
