import type { ActiveSession, WorkoutSessionEventRecord, WorkoutSessionJson } from "@/types";

function isRecord(value: WorkoutSessionJson | undefined): value is Record<string, WorkoutSessionJson> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function isActiveSessionSnapshot(
  value: WorkoutSessionJson | null | undefined,
): value is ActiveSession & WorkoutSessionJson {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.workoutId === "string" &&
    typeof value.workoutName === "string" &&
    typeof value.status === "string" &&
    typeof value.currentExerciseIndex === "number" &&
    typeof value.currentSetIndex === "number" &&
    Array.isArray(value.exercises) &&
    typeof value.version === "number" &&
    typeof value.updatedAt === "number"
  );
}

function payloadState(payload: WorkoutSessionJson): WorkoutSessionJson | null {
  if (!isRecord(payload)) return null;
  return (
    payload.nextState ??
    payload.currentState ??
    payload.activeSession ??
    payload.session ??
    payload.state ??
    null
  );
}

/**
 * Minimal event replay for active-workout hydration. The server keeps the latest
 * snapshot in `workout_sessions.current_state`; events may optionally carry a
 * full follow-up snapshot under one of the supported keys. Unknown delta-only
 * events are ignored until the full command reducer is introduced.
 */
export function reduceWorkoutSessionEvents(
  initial: ActiveSession,
  events: WorkoutSessionEventRecord[],
): ActiveSession {
  return events.reduce((session, event) => {
    const next = payloadState(event.payload);
    return isActiveSessionSnapshot(next) ? next : session;
  }, initial);
}
