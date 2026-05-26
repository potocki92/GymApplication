import { averageReps } from "@/lib/workout-utils";
import type {
  ActiveExercise,
  ActiveSession,
  CompletedSession,
  LoggedSet,
  Workout,
  WorkoutExercise,
} from "@/types";
import { SESSION_SCHEMA_VERSION } from "@/types/session";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** Suggested starting reps for a set, derived from its plan range ("8-12" -> 10). */
export function suggestedReps(targetReps: string): number {
  return Math.round(averageReps(targetReps));
}

export function makeLoggedSet(ex: WorkoutExercise, setNumber: number): LoggedSet {
  return {
    id: `${ex.id}-set-${setNumber}-${uid()}`,
    setNumber,
    status: "pending",
    targetReps: ex.reps,
    targetWeightKg: ex.weightKg,
    actualReps: null,
    actualWeightKg: null,
    restTargetSec: ex.restSec,
    startedAt: null,
    completedAt: null,
    rpe: null,
    notes: null,
  };
}

/** Build a fresh, not-yet-started session from a planned workout. */
export function buildActiveSession(workout: Workout): ActiveSession {
  const exercises: ActiveExercise[] = [...workout.exercises]
    .sort((a, b) => a.order - b.order)
    .map((ex) => ({
      id: ex.id,
      exerciseId: ex.exerciseId,
      order: ex.order,
      targetReps: ex.reps,
      targetWeightKg: ex.weightKg,
      sets: Array.from({ length: Math.max(1, ex.sets) }, (_, i) =>
        makeLoggedSet(ex, i + 1),
      ),
    }));

  return {
    id: `session-${uid()}`,
    workoutId: workout.id,
    workoutName: workout.name,
    status: "planning",
    startedAt: null,
    finishedAt: null,
    pausedAt: null,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    restStartedAt: null,
    restTargetSec: 0,
    exercises,
    version: SESSION_SCHEMA_VERSION,
    updatedAt: Date.now(),
  };
}

export function currentExercise(session: ActiveSession): ActiveExercise | undefined {
  return session.exercises[session.currentExerciseIndex];
}

export function currentSet(session: ActiveSession): LoggedSet | undefined {
  return currentExercise(session)?.sets[session.currentSetIndex];
}

/**
 * The set just before the cursor — i.e. the most recent set that the user
 * actually finished. Used during `resting` so the UI can attach RPE/notes to the
 * lift the user just performed (not the upcoming pending one).
 */
export function previousSet(
  session: ActiveSession,
): { exerciseIndex: number; set: LoggedSet } | null {
  if (session.currentSetIndex > 0) {
    const ex = session.exercises[session.currentExerciseIndex];
    const set = ex?.sets[session.currentSetIndex - 1];
    if (set) return { exerciseIndex: session.currentExerciseIndex, set };
  }
  for (let e = session.currentExerciseIndex - 1; e >= 0; e -= 1) {
    const ex = session.exercises[e];
    if (ex && ex.sets.length > 0) {
      return { exerciseIndex: e, set: ex.sets[ex.sets.length - 1] };
    }
  }
  return null;
}

/**
 * The set the user should be logging metadata for right now. During `executing`
 * that's the active set; during `resting` it's the one just completed. Other
 * states have no logging target.
 */
export function loggingTarget(
  session: ActiveSession,
): { exerciseIndex: number; set: LoggedSet } | null {
  if (session.status === "executing") {
    const set = currentSet(session);
    return set ? { exerciseIndex: session.currentExerciseIndex, set } : null;
  }
  if (session.status === "resting") {
    return previousSet(session);
  }
  return null;
}

/** Total / completed set counts across the whole session. */
export function setProgress(session: ActiveSession): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      total += 1;
      if (s.status === "completed" || s.status === "skipped") done += 1;
    }
  }
  return { done, total };
}

/**
 * The set after the given cursor, scanning into later exercises. Returns null when
 * the workout is over.
 */
export function nextCursor(
  session: ActiveSession,
  exerciseIndex: number,
  setIndex: number,
): { exerciseIndex: number; setIndex: number } | null {
  const ex = session.exercises[exerciseIndex];
  if (ex && setIndex + 1 < ex.sets.length) {
    return { exerciseIndex, setIndex: setIndex + 1 };
  }
  for (let e = exerciseIndex + 1; e < session.exercises.length; e += 1) {
    if (session.exercises[e].sets.length > 0) {
      return { exerciseIndex: e, setIndex: 0 };
    }
  }
  return null;
}

export function totalCompletedVolume(session: ActiveSession): number {
  return session.exercises.reduce(
    (total, ex) =>
      total +
      ex.sets.reduce((s, set) => {
        if (set.status !== "completed") return s;
        return s + (set.actualReps ?? 0) * (set.actualWeightKg ?? 0);
      }, 0),
    0,
  );
}

export function toCompletedSession(session: ActiveSession): CompletedSession {
  const startedAt = session.startedAt ?? session.updatedAt;
  const finishedAt = session.finishedAt ?? Date.now();
  return {
    id: session.id,
    workoutId: session.workoutId,
    workoutName: session.workoutName,
    startedAt,
    finishedAt,
    totalActiveMs: Math.max(0, finishedAt - startedAt),
    exercises: session.exercises,
  };
}

/* --------------------------- derived clock values --------------------------- */

export interface ClockValues {
  totalMs: number;
  setMs: number;
  restRemainingMs: number;
  restElapsedMs: number;
  restDone: boolean;
}

const ZERO_CLOCK: ClockValues = {
  totalMs: 0,
  setMs: 0,
  restRemainingMs: 0,
  restElapsedMs: 0,
  restDone: false,
};

/**
 * Pure derivation of all three timers from absolute anchors. When paused, `pausedAt`
 * is used as the reference instant so every clock freezes consistently.
 */
export function computeClock(session: ActiveSession | null, now: number): ClockValues {
  if (!session) return ZERO_CLOCK;
  const ref = session.pausedAt ?? now;

  const totalMs =
    session.startedAt == null ? 0 : Math.max(0, ref - session.startedAt);

  const cur = currentSet(session);
  const setMs =
    (session.status === "executing" || session.status === "paused") &&
    cur?.startedAt != null &&
    cur.completedAt == null
      ? Math.max(0, ref - cur.startedAt)
      : 0;

  let restRemainingMs = 0;
  let restElapsedMs = 0;
  let restDone = false;
  if (
    (session.status === "resting" || session.status === "paused") &&
    session.restStartedAt != null
  ) {
    restElapsedMs = Math.max(0, ref - session.restStartedAt);
    restRemainingMs = Math.max(0, session.restTargetSec * 1000 - restElapsedMs);
    restDone = restRemainingMs <= 0;
  }

  return { totalMs, setMs, restRemainingMs, restElapsedMs, restDone };
}
