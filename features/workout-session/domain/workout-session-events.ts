export type WorkoutSessionEventType =
  | "WORKOUT_STARTED"
  | "EXERCISE_STARTED"
  | "SET_STARTED"
  | "SET_COMPLETED"
  | "SET_UPDATED"
  | "SET_DELETED"
  | "REST_STARTED"
  | "REST_FINISHED"
  | "REST_SKIPPED"
  | "WORKOUT_PAUSED"
  | "WORKOUT_RESUMED"
  | "WORKOUT_FINISHED"
  | "WORKOUT_ABANDONED"
  | "NOTE_ADDED";

interface BaseWorkoutSessionEvent<TType extends WorkoutSessionEventType, TPayload> {
  id: string;
  type: TType;
  occurredAt: number;
  payload: TPayload;
  clientEventId?: string;
  deviceId?: string | null;
  sequenceNumber?: number;
}

export type WorkoutSessionEvent =
  | BaseWorkoutSessionEvent<
      "WORKOUT_STARTED",
      {
        sessionId: string;
        workoutId: string;
        workoutName: string;
        startedAt?: number;
      }
    >
  | BaseWorkoutSessionEvent<
      "EXERCISE_STARTED",
      { exerciseId: string; exerciseIndex: number }
    >
  | BaseWorkoutSessionEvent<
      "SET_STARTED",
      {
        exerciseId: string;
        setIndex: number;
        startedAt?: number;
        reps?: number;
        weightKg?: number;
      }
    >
  | BaseWorkoutSessionEvent<
      "SET_COMPLETED",
      {
        exerciseId: string;
        setIndex: number;
        completedAt?: number;
        reps: number;
        weightKg: number;
        rpe?: number | null;
        notes?: string | null;
      }
    >
  | BaseWorkoutSessionEvent<
      "SET_UPDATED",
      {
        exerciseId: string;
        setIndex: number;
        reps?: number;
        weightKg?: number;
        rpe?: number | null;
        notes?: string | null;
      }
    >
  | BaseWorkoutSessionEvent<
      "SET_DELETED",
      { exerciseId: string; setIndex: number }
    >
  | BaseWorkoutSessionEvent<
      "REST_STARTED",
      {
        durationSec: number;
        startedAt?: number;
        exerciseId?: string;
        setIndex?: number;
      }
    >
  | BaseWorkoutSessionEvent<"REST_FINISHED", { finishedAt?: number }>
  | BaseWorkoutSessionEvent<"REST_SKIPPED", { skippedAt?: number }>
  | BaseWorkoutSessionEvent<"WORKOUT_PAUSED", { pausedAt?: number }>
  | BaseWorkoutSessionEvent<"WORKOUT_RESUMED", { resumedAt?: number }>
  | BaseWorkoutSessionEvent<"WORKOUT_FINISHED", { finishedAt?: number }>
  | BaseWorkoutSessionEvent<"WORKOUT_ABANDONED", { abandonedAt?: number }>
  | BaseWorkoutSessionEvent<
      "NOTE_ADDED",
      {
        note: string;
        createdAt?: number;
        exerciseId?: string;
        setIndex?: number;
      }
    >;
