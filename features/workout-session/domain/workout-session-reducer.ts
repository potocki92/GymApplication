import type { WorkoutSessionEvent } from "./workout-session-events";
import {
  EMPTY_REST_TIMER,
  type WorkoutSessionSet,
  type WorkoutSessionState,
} from "./workout-session-state";

function eventTime(event: WorkoutSessionEvent): number {
  return event.occurredAt;
}

function ensureState(
  state: WorkoutSessionState | null,
  event: WorkoutSessionEvent,
): WorkoutSessionState {
  if (!state) {
    throw new Error(`${event.type} cannot be applied before WORKOUT_STARTED`);
  }
  return state;
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  if (value == null) return 0;
  return Math.max(0, Math.round(value));
}

function normalizeNonNegativeWeight(value: number | undefined): number {
  if (value == null) return 0;
  return Math.max(0, value);
}

function findSetIndex(
  sets: WorkoutSessionSet[],
  exerciseId: string,
  setIndex: number,
): number {
  return sets.findIndex(
    (set) => set.exerciseId === exerciseId && set.setIndex === setIndex,
  );
}

function upsertSet(
  sets: WorkoutSessionSet[],
  nextSet: WorkoutSessionSet,
): WorkoutSessionSet[] {
  const index = findSetIndex(sets, nextSet.exerciseId, nextSet.setIndex);
  if (index < 0) return [...sets, nextSet];
  return sets.map((set, i) => (i === index ? nextSet : set));
}

function updateExistingSet(
  sets: WorkoutSessionSet[],
  exerciseId: string,
  setIndex: number,
  update: (set: WorkoutSessionSet) => WorkoutSessionSet,
): WorkoutSessionSet[] {
  return sets.map((set) =>
    set.exerciseId === exerciseId && set.setIndex === setIndex ? update(set) : set,
  );
}

export function applyWorkoutSessionEvent(
  state: WorkoutSessionState | null,
  event: WorkoutSessionEvent,
): WorkoutSessionState {
  switch (event.type) {
    case "WORKOUT_STARTED": {
      const startedAt = event.payload.startedAt ?? eventTime(event);
      return {
        sessionId: event.payload.sessionId,
        workoutId: event.payload.workoutId,
        workoutName: event.payload.workoutName,
        status: "active",
        startedAt,
        finishedAt: null,
        totalPausedMs: 0,
        pausedAt: null,
        currentExerciseId: null,
        currentExerciseIndex: null,
        sets: [],
        restTimer: { ...EMPTY_REST_TIMER },
        notes: [],
      };
    }

    case "EXERCISE_STARTED": {
      const current = ensureState(state, event);
      return {
        ...current,
        status: current.status === "paused" ? current.status : "active",
        currentExerciseId: event.payload.exerciseId,
        currentExerciseIndex: event.payload.exerciseIndex,
      };
    }

    case "SET_STARTED": {
      const current = ensureState(state, event);
      const set: WorkoutSessionSet = {
        exerciseId: event.payload.exerciseId,
        setIndex: event.payload.setIndex,
        reps: normalizeNonNegativeInteger(event.payload.reps),
        weightKg: normalizeNonNegativeWeight(event.payload.weightKg),
        rpe: null,
        notes: null,
        startedAt: event.payload.startedAt ?? eventTime(event),
        completedAt: null,
        status: "started",
      };
      return {
        ...current,
        sets: upsertSet(current.sets, set),
        currentExerciseId: event.payload.exerciseId,
      };
    }

    case "SET_COMPLETED": {
      const current = ensureState(state, event);
      const completedAt = event.payload.completedAt ?? eventTime(event);
      const existingIndex = findSetIndex(
        current.sets,
        event.payload.exerciseId,
        event.payload.setIndex,
      );
      const completedSet: WorkoutSessionSet =
        existingIndex >= 0
          ? {
              ...current.sets[existingIndex],
              reps: normalizeNonNegativeInteger(event.payload.reps),
              weightKg: normalizeNonNegativeWeight(event.payload.weightKg),
              rpe: event.payload.rpe ?? current.sets[existingIndex].rpe,
              notes: event.payload.notes ?? current.sets[existingIndex].notes,
              completedAt,
              status: "completed",
            }
          : {
              exerciseId: event.payload.exerciseId,
              setIndex: event.payload.setIndex,
              reps: normalizeNonNegativeInteger(event.payload.reps),
              weightKg: normalizeNonNegativeWeight(event.payload.weightKg),
              rpe: event.payload.rpe ?? null,
              notes: event.payload.notes ?? null,
              startedAt: null,
              completedAt,
              status: "completed",
            };
      return {
        ...current,
        sets: upsertSet(current.sets, completedSet),
        currentExerciseId: event.payload.exerciseId,
      };
    }

    case "SET_UPDATED": {
      const current = ensureState(state, event);
      return {
        ...current,
        sets: updateExistingSet(
          current.sets,
          event.payload.exerciseId,
          event.payload.setIndex,
          (set) => ({
            ...set,
            reps:
              event.payload.reps === undefined
                ? set.reps
                : normalizeNonNegativeInteger(event.payload.reps),
            weightKg:
              event.payload.weightKg === undefined
                ? set.weightKg
                : normalizeNonNegativeWeight(event.payload.weightKg),
            rpe: event.payload.rpe === undefined ? set.rpe : event.payload.rpe,
            notes:
              event.payload.notes === undefined ? set.notes : event.payload.notes,
          }),
        ),
      };
    }

    case "SET_DELETED": {
      const current = ensureState(state, event);
      return {
        ...current,
        sets: updateExistingSet(
          current.sets,
          event.payload.exerciseId,
          event.payload.setIndex,
          (set) => ({ ...set, status: "deleted" }),
        ),
      };
    }

    case "REST_STARTED": {
      const current = ensureState(state, event);
      return {
        ...current,
        restTimer: {
          status: "active",
          startedAt: event.payload.startedAt ?? eventTime(event),
          finishedAt: null,
          durationSec: Math.max(0, Math.round(event.payload.durationSec)),
          exerciseId: event.payload.exerciseId ?? null,
          setIndex: event.payload.setIndex ?? null,
        },
      };
    }

    case "REST_FINISHED": {
      const current = ensureState(state, event);
      return {
        ...current,
        restTimer: {
          ...current.restTimer,
          status: "finished",
          finishedAt: event.payload.finishedAt ?? eventTime(event),
        },
      };
    }

    case "REST_SKIPPED": {
      const current = ensureState(state, event);
      return {
        ...current,
        restTimer: {
          ...current.restTimer,
          status: "skipped",
          finishedAt: event.payload.skippedAt ?? eventTime(event),
        },
      };
    }

    case "WORKOUT_PAUSED": {
      const current = ensureState(state, event);
      if (current.status === "paused") return current;
      return {
        ...current,
        status: "paused",
        pausedAt: event.payload.pausedAt ?? eventTime(event),
      };
    }

    case "WORKOUT_RESUMED": {
      const current = ensureState(state, event);
      const resumedAt = event.payload.resumedAt ?? eventTime(event);
      const pauseDelta =
        current.pausedAt == null ? 0 : Math.max(0, resumedAt - current.pausedAt);
      return {
        ...current,
        status: "active",
        pausedAt: null,
        totalPausedMs: current.totalPausedMs + pauseDelta,
      };
    }

    case "WORKOUT_FINISHED": {
      const current = ensureState(state, event);
      return {
        ...current,
        status: "completed",
        finishedAt: event.payload.finishedAt ?? eventTime(event),
        pausedAt: null,
        restTimer: { ...current.restTimer, status: "idle" },
      };
    }

    case "WORKOUT_ABANDONED": {
      const current = ensureState(state, event);
      return {
        ...current,
        status: "abandoned",
        finishedAt: event.payload.abandonedAt ?? eventTime(event),
        pausedAt: null,
        restTimer: { ...current.restTimer, status: "idle" },
      };
    }

    case "EXERCISE_ADDED": {
      // Sets are materialized lazily from SET_STARTED/COMPLETED, so the new
      // exercise itself adds no set rows here. But adding an exercise to a
      // finished session re-opens it for execution — mirror the ActiveSession
      // reducer so both projections stay consistent (status active, finishedAt
      // cleared) instead of leaving a stale "completed" state.
      const current = ensureState(state, event);
      if (current.status === "completed") {
        return {
          ...current,
          status: "active",
          finishedAt: null,
          currentExerciseId: event.payload.exerciseId,
        };
      }
      return current;
    }

    case "NOTE_ADDED": {
      const current = ensureState(state, event);
      return {
        ...current,
        notes: [
          ...current.notes,
          {
            id: event.id,
            note: event.payload.note,
            createdAt: event.payload.createdAt ?? eventTime(event),
            exerciseId: event.payload.exerciseId,
            setIndex: event.payload.setIndex,
          },
        ],
      };
    }
  }
}

export function replayWorkoutSessionEvents(
  initialState: WorkoutSessionState | null,
  events: readonly WorkoutSessionEvent[],
): WorkoutSessionState | null {
  return events.reduce<WorkoutSessionState | null>(
    (state, event) => applyWorkoutSessionEvent(state, event),
    initialState,
  );
}
