import type { WorkoutSessionEventType } from "@/features/workout-session/domain/workout-session-events";

const WORKOUT_SESSION_EVENT_TYPES = [
  "WORKOUT_STARTED",
  "EXERCISE_STARTED",
  "SET_STARTED",
  "SET_COMPLETED",
  "SET_UPDATED",
  "SET_DELETED",
  "REST_STARTED",
  "REST_FINISHED",
  "REST_SKIPPED",
  "WORKOUT_PAUSED",
  "WORKOUT_RESUMED",
  "WORKOUT_FINISHED",
  "WORKOUT_ABANDONED",
  "NOTE_ADDED",
] as const satisfies readonly WorkoutSessionEventType[];

const WORKOUT_SESSION_EVENT_TYPE_SET = new Set<string>(WORKOUT_SESSION_EVENT_TYPES);

export function isWorkoutSessionEventType(value: unknown): value is WorkoutSessionEventType {
  return typeof value === "string" && WORKOUT_SESSION_EVENT_TYPE_SET.has(value);
}

export function assertWorkoutSessionEventType(value: string): WorkoutSessionEventType {
  if (isWorkoutSessionEventType(value)) return value;
  throw new Error(`Unsupported workout session event type: ${value}`);
}
