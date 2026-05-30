import type { WorkoutSessionSet, WorkoutSessionState } from "./workout-session-state";

function isCompletedSet(set: WorkoutSessionSet): boolean {
  return set.status === "completed";
}

function elapsedPauseMs(state: WorkoutSessionState, now: number): number {
  if (state.status !== "paused" || state.pausedAt == null) return 0;
  return Math.max(0, now - state.pausedAt);
}

export function getElapsedWorkoutMs(
  state: WorkoutSessionState,
  now: number,
): number {
  const end = state.finishedAt ?? now;
  const elapsed = end - state.startedAt - state.totalPausedMs - elapsedPauseMs(state, now);
  return Math.max(0, elapsed);
}

export function getRestRemainingSec(
  state: WorkoutSessionState,
  now: number,
): number {
  if (state.restTimer.status !== "active" || state.restTimer.startedAt == null) {
    return 0;
  }
  const elapsedSec = Math.max(
    0,
    Math.floor((now - state.restTimer.startedAt) / 1000),
  );
  return Math.max(0, state.restTimer.durationSec - elapsedSec);
}

export function getCompletedSets(state: WorkoutSessionState): WorkoutSessionSet[] {
  return state.sets.filter(isCompletedSet);
}

export function getTotalVolumeKg(state: WorkoutSessionState): number {
  return getCompletedSets(state).reduce(
    (total, set) => total + set.reps * set.weightKg,
    0,
  );
}

export function getTotalReps(state: WorkoutSessionState): number {
  return getCompletedSets(state).reduce((total, set) => total + set.reps, 0);
}

export function getExercisesCount(state: WorkoutSessionState): number {
  const exerciseIds = new Set(getCompletedSets(state).map((set) => set.exerciseId));
  return exerciseIds.size;
}
