import type { WorkoutSessionEvent } from "@/features/workout-session/domain/workout-session-events";
import { currentSet, nextCursor, suggestedReps } from "@/lib/session-utils";
import { cloneSerializable, isJsonRecord, stableJson } from "@/lib/workout-session-serialization";
import type {
  ActiveSession,
  WorkoutSessionEventRecord,
  WorkoutSessionJson,
  WorkoutSessionOutboxEvent,
} from "@/types";

function clone<T>(value: T): T {
  return cloneSerializable(value);
}

function isRecord(value: WorkoutSessionJson | undefined): value is Record<string, WorkoutSessionJson> {
  return isJsonRecord(value);
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
    payload.initialState ??
    payload.nextState ??
    payload.currentState ??
    payload.activeSession ??
    payload.session ??
    payload.state ??
    null
  );
}

function payloadRecord(payload: WorkoutSessionJson): Record<string, WorkoutSessionJson> {
  return isRecord(payload) ? payload : {};
}

function stringValue(value: WorkoutSessionJson | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: WorkoutSessionJson | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nullableNumberValue(value: WorkoutSessionJson | undefined): number | null | undefined {
  if (value === null) return null;
  return numberValue(value);
}

function nullableStringValue(value: WorkoutSessionJson | undefined): string | null | undefined {
  if (value === null) return null;
  return stringValue(value);
}

function activateCurrentSet(s: ActiveSession, now: number): void {
  const set = s.exercises[s.currentExerciseIndex]?.sets[s.currentSetIndex];
  if (!set) return;
  s.status = "executing";
  s.restStartedAt = null;
  s.restTargetSec = 0;
  set.startedAt = now;
  set.status = "active";
  if (set.actualReps == null) set.actualReps = suggestedReps(set.targetReps);
  if (set.actualWeightKg == null) set.actualWeightKg = set.targetWeightKg;
}

function applyWorkoutSessionEventDraft(
  next: ActiveSession,
  event: WorkoutSessionEvent,
): boolean {
  const now = event.occurredAt;

  switch (event.type) {
    case "WORKOUT_STARTED":
      return true;

    case "EXERCISE_STARTED": {
      const ex = next.exercises[event.payload.exerciseIndex];
      if (!ex || ex.id !== event.payload.exerciseId) return false;
      if (next.status !== "executing" && next.status !== "resting") return false;

      const current = next.exercises[next.currentExerciseIndex];
      if (current) {
        for (const st of current.sets) {
          if (st.status === "pending" || st.status === "active") {
            st.status = "skipped";
          }
        }
      }

      next.currentExerciseIndex = event.payload.exerciseIndex;
      next.currentSetIndex = 0;
      next.restStartedAt = null;
      next.restTargetSec = 0;
      activateCurrentSet(next, now);
      break;
    }

    case "SET_STARTED": {
      if (next.status !== "planning" && next.status !== "executing" && next.status !== "resting") {
        return false;
      }
      const exIndex = next.exercises.findIndex(
        (ex) => ex.id === event.payload.exerciseId,
      );
      const target = exIndex < 0 ? undefined : next.exercises[exIndex].sets[event.payload.setIndex];
      if (!target || target.status === "completed" || target.status === "skipped") {
        return false;
      }
      next.startedAt ??= event.payload.startedAt ?? now;
      next.currentExerciseIndex = exIndex;
      next.currentSetIndex = event.payload.setIndex;
      activateCurrentSet(next, event.payload.startedAt ?? now);
      const set = currentSet(next);
      if (set) {
        if (event.payload.reps != null) {
          set.actualReps = Math.max(0, Math.round(event.payload.reps));
        }
        if (event.payload.weightKg != null) {
          set.actualWeightKg = Math.max(0, event.payload.weightKg);
        }
      }
      break;
    }

    case "SET_COMPLETED": {
      if (next.status !== "executing") return false;
      const exIndex = next.exercises.findIndex(
        (ex) => ex.id === event.payload.exerciseId,
      );
      const set = next.exercises[exIndex]?.sets[event.payload.setIndex];
      if (!set || set.status === "completed" || set.status === "skipped") return false;

      next.currentExerciseIndex = exIndex;
      next.currentSetIndex = event.payload.setIndex;
      set.completedAt = event.payload.completedAt ?? now;
      set.status = "completed";
      set.actualReps = Math.max(0, Math.round(event.payload.reps));
      set.actualWeightKg = Math.max(0, event.payload.weightKg);
      if (event.payload.rpe !== undefined) set.rpe = event.payload.rpe;
      if (event.payload.notes !== undefined) set.notes = event.payload.notes;

      const cursor = nextCursor(next, exIndex, event.payload.setIndex);
      if (!cursor) {
        next.status = "finished";
        next.finishedAt = set.completedAt;
        next.restStartedAt = null;
        next.restTargetSec = 0;
        break;
      }

      const restSec = set.restTargetSec;
      next.currentExerciseIndex = cursor.exerciseIndex;
      next.currentSetIndex = cursor.setIndex;
      if (restSec > 0) {
        next.status = "resting";
        next.restStartedAt = set.completedAt;
        next.restTargetSec = restSec;
      } else {
        activateCurrentSet(next, set.completedAt);
      }
      break;
    }

    case "SET_UPDATED": {
      const ex = next.exercises.find((item) => item.id === event.payload.exerciseId);
      const target = ex?.sets[event.payload.setIndex];
      if (!target) return false;
      if (event.payload.reps !== undefined) {
        target.actualReps = Math.max(0, Math.round(event.payload.reps));
      }
      if (event.payload.weightKg !== undefined) {
        target.actualWeightKg = Math.max(0, event.payload.weightKg);
      }
      if (event.payload.rpe !== undefined) target.rpe = event.payload.rpe;
      if (event.payload.notes !== undefined) target.notes = event.payload.notes;
      if (event.payload.restTargetSec !== undefined) {
        target.restTargetSec = Math.max(0, Math.round(event.payload.restTargetSec));
      }
      break;
    }

    case "SET_DELETED": {
      const ex = next.exercises.find((item) => item.id === event.payload.exerciseId);
      if (!ex) return false;
      const target = ex.sets[event.payload.setIndex];
      if (!target || target.status !== "pending") return false;
      if (
        next.exercises[next.currentExerciseIndex]?.id === event.payload.exerciseId &&
        next.currentSetIndex === event.payload.setIndex
      ) {
        return false;
      }
      ex.sets.splice(event.payload.setIndex, 1);
      ex.sets.forEach((set, index) => (set.setNumber = index + 1));
      if (
        next.exercises[next.currentExerciseIndex]?.id === event.payload.exerciseId &&
        event.payload.setIndex < next.currentSetIndex
      ) {
        next.currentSetIndex -= 1;
      }
      break;
    }

    case "EXERCISE_ADDED": {
      const setCount = Math.max(0, Math.round(event.payload.sets));
      if (setCount < 1) return false;
      const order = next.exercises.length;
      const exerciseElementId = `${event.id}-ex`;
      const newExercise: ActiveSession["exercises"][number] = {
        id: exerciseElementId,
        exerciseId: event.payload.exerciseId,
        order,
        targetReps: event.payload.reps,
        targetWeightKg: Math.max(0, event.payload.weightKg),
        sets: Array.from({ length: setCount }, (_, i) => ({
          id: `${exerciseElementId}-set-${i + 1}`,
          setNumber: i + 1,
          status: "pending" as const,
          targetReps: event.payload.reps,
          targetWeightKg: Math.max(0, event.payload.weightKg),
          actualReps: null,
          actualWeightKg: null,
          restTargetSec: Math.max(0, Math.round(event.payload.restSec)),
          startedAt: null,
          completedAt: null,
          rpe: null,
          notes: null,
        })),
      };
      next.exercises.push(newExercise);

      // Adding an exercise after the workout was finished re-opens the session so
      // the new exercise can actually be performed. The view follows `status`.
      if (next.status === "finished") {
        next.finishedAt = null;
        next.currentExerciseIndex = order;
        next.currentSetIndex = 0;
        activateCurrentSet(next, now);
      }
      break;
    }

    case "REST_STARTED": {
      next.status = "resting";
      next.restStartedAt = event.payload.startedAt ?? now;
      next.restTargetSec = Math.max(0, Math.round(event.payload.durationSec));
      break;
    }

    case "REST_FINISHED":
    case "REST_SKIPPED": {
      if (next.status !== "resting") return false;
      activateCurrentSet(
        next,
        event.type === "REST_FINISHED"
          ? event.payload.finishedAt ?? now
          : event.payload.skippedAt ?? now,
      );
      break;
    }

    case "WORKOUT_PAUSED": {
      if (next.status === "paused") return false;
      if (next.status !== "executing" && next.status !== "resting") return false;
      next.pausedAt = event.payload.pausedAt ?? now;
      next.status = "paused";
      break;
    }

    case "WORKOUT_RESUMED": {
      if (next.status !== "paused" || next.pausedAt == null) return false;
      const resumedAt = event.payload.resumedAt ?? now;
      const delta = Math.max(0, resumedAt - next.pausedAt);
      if (next.startedAt != null) next.startedAt += delta;
      if (next.restStartedAt != null) {
        next.restStartedAt += delta;
        next.status = "resting";
      } else {
        const cur = currentSet(next);
        if (cur?.startedAt != null && cur.completedAt == null) {
          cur.startedAt += delta;
        }
        next.status = "executing";
      }
      next.pausedAt = null;
      break;
    }

    case "WORKOUT_FINISHED": {
      if (next.status === "finished" || next.status === "planning") return false;
      for (const ex of next.exercises) {
        for (const st of ex.sets) {
          if (st.status === "pending" || st.status === "active") {
            st.status = "skipped";
          }
        }
      }
      next.status = "finished";
      next.finishedAt = event.payload.finishedAt ?? now;
      next.restStartedAt = null;
      next.pausedAt = null;
      break;
    }

    case "NOTE_ADDED": {
      const ex = event.payload.exerciseId
        ? next.exercises.find((item) => item.id === event.payload.exerciseId)
        : undefined;
      const target =
        ex && event.payload.setIndex != null ? ex.sets[event.payload.setIndex] : null;
      if (!target) return false;
      const trimmed = event.payload.note.trim();
      target.notes = trimmed === "" ? null : trimmed;
      break;
    }

    default:
      return false;
  }

  next.updatedAt = now;
  return true;
}

export function applyWorkoutSessionEvent(
  session: ActiveSession,
  event: WorkoutSessionEvent,
): ActiveSession | null {
  const next = clone(session);
  return applyWorkoutSessionEventDraft(next, event) ? next : null;
}

export function workoutSessionEventFromRecord(
  record: Pick<WorkoutSessionEventRecord, "id" | "eventType" | "payload" | "clientEventId" | "deviceId" | "sequenceNumber" | "createdAt">,
): WorkoutSessionEvent | null {
  const payload = payloadRecord(record.payload);
  const base = {
    id: record.id,
    occurredAt: record.createdAt,
    clientEventId: record.clientEventId,
    deviceId: record.deviceId ?? null,
    sequenceNumber: record.sequenceNumber,
  };

  switch (record.eventType) {
    case "WORKOUT_STARTED":
      return {
        ...base,
        type: "WORKOUT_STARTED",
        payload: {
          sessionId: stringValue(payload.sessionId) ?? "",
          workoutId: stringValue(payload.workoutId) ?? "",
          workoutName: stringValue(payload.workoutName) ?? "",
          startedAt: numberValue(payload.startedAt),
        },
      };
    case "EXERCISE_STARTED": {
      const exerciseId = stringValue(payload.exerciseId);
      const exerciseIndex = numberValue(payload.exerciseIndex);
      if (!exerciseId || exerciseIndex == null) return null;
      return { ...base, type: "EXERCISE_STARTED", payload: { exerciseId, exerciseIndex } };
    }
    case "SET_STARTED": {
      const exerciseId = stringValue(payload.exerciseId);
      const setIndex = numberValue(payload.setIndex);
      if (!exerciseId || setIndex == null) return null;
      return {
        ...base,
        type: "SET_STARTED",
        payload: {
          exerciseId,
          setIndex,
          startedAt: numberValue(payload.startedAt),
          reps: numberValue(payload.reps),
          weightKg: numberValue(payload.weightKg),
        },
      };
    }
    case "SET_COMPLETED": {
      const exerciseId = stringValue(payload.exerciseId);
      const setIndex = numberValue(payload.setIndex);
      const reps = numberValue(payload.reps);
      const weightKg = numberValue(payload.weightKg);
      if (!exerciseId || setIndex == null || reps == null || weightKg == null) return null;
      return {
        ...base,
        type: "SET_COMPLETED",
        payload: {
          exerciseId,
          setIndex,
          completedAt: numberValue(payload.completedAt),
          reps,
          weightKg,
          rpe: nullableNumberValue(payload.rpe),
          notes: nullableStringValue(payload.notes),
        },
      };
    }
    case "SET_UPDATED": {
      const exerciseId = stringValue(payload.exerciseId);
      const setIndex = numberValue(payload.setIndex);
      if (!exerciseId || setIndex == null) return null;
      return {
        ...base,
        type: "SET_UPDATED",
        payload: {
          exerciseId,
          setIndex,
          reps: numberValue(payload.reps),
          weightKg: numberValue(payload.weightKg),
          rpe: nullableNumberValue(payload.rpe),
          notes: nullableStringValue(payload.notes),
          restTargetSec: numberValue(payload.restTargetSec),
        },
      };
    }
    case "SET_DELETED": {
      const exerciseId = stringValue(payload.exerciseId);
      const setIndex = numberValue(payload.setIndex);
      if (!exerciseId || setIndex == null) return null;
      return { ...base, type: "SET_DELETED", payload: { exerciseId, setIndex } };
    }
    case "EXERCISE_ADDED": {
      const exerciseId = stringValue(payload.exerciseId);
      if (!exerciseId) return null;
      return {
        ...base,
        type: "EXERCISE_ADDED",
        payload: {
          exerciseId,
          sets: numberValue(payload.sets) ?? 1,
          reps: stringValue(payload.reps) ?? "8-12",
          weightKg: numberValue(payload.weightKg) ?? 0,
          restSec: numberValue(payload.restSec) ?? 0,
        },
      };
    }
    case "REST_STARTED": {
      const durationSec = numberValue(payload.durationSec);
      if (durationSec == null) return null;
      return {
        ...base,
        type: "REST_STARTED",
        payload: {
          durationSec,
          startedAt: numberValue(payload.startedAt),
          exerciseId: stringValue(payload.exerciseId),
          setIndex: numberValue(payload.setIndex),
        },
      };
    }
    case "REST_FINISHED":
      return { ...base, type: "REST_FINISHED", payload: { finishedAt: numberValue(payload.finishedAt) } };
    case "REST_SKIPPED":
      return { ...base, type: "REST_SKIPPED", payload: { skippedAt: numberValue(payload.skippedAt) } };
    case "WORKOUT_PAUSED":
      return { ...base, type: "WORKOUT_PAUSED", payload: { pausedAt: numberValue(payload.pausedAt) } };
    case "WORKOUT_RESUMED":
      return { ...base, type: "WORKOUT_RESUMED", payload: { resumedAt: numberValue(payload.resumedAt) } };
    case "WORKOUT_FINISHED":
      return { ...base, type: "WORKOUT_FINISHED", payload: { finishedAt: numberValue(payload.finishedAt) } };
    case "NOTE_ADDED": {
      const note = stringValue(payload.note);
      if (note == null) return null;
      return {
        ...base,
        type: "NOTE_ADDED",
        payload: {
          note,
          createdAt: numberValue(payload.createdAt),
          exerciseId: stringValue(payload.exerciseId),
          setIndex: numberValue(payload.setIndex),
        },
      };
    }
    default:
      return null;
  }
}

export interface WorkoutSessionReplayResult {
  session: ActiveSession | null;
  serverVersion: number;
  appliedClientEventIds: string[];
  duplicateClientEventIds: string[];
  skippedEventIds: string[];
}

function replayOnce(
  initial: ActiveSession | null,
  events: WorkoutSessionEventRecord[],
): WorkoutSessionReplayResult {
  let session = initial ? clone(initial) : null;
  let serverVersion = 0;
  const seenClientEventIds = new Set<string>();
  const appliedClientEventIds: string[] = [];
  const duplicateClientEventIds: string[] = [];
  const skippedEventIds: string[] = [];

  const ordered = [...events].sort((a, b) => {
    if (a.sequenceNumber !== b.sequenceNumber) return a.sequenceNumber - b.sequenceNumber;
    return a.createdAt - b.createdAt;
  });

  for (const record of ordered) {
    serverVersion = Math.max(serverVersion, record.sequenceNumber);
    if (seenClientEventIds.has(record.clientEventId)) {
      duplicateClientEventIds.push(record.clientEventId);
      continue;
    }

    const snapshot = payloadState(record.payload);
    if (!session) {
      if (record.eventType === "WORKOUT_STARTED" && isActiveSessionSnapshot(snapshot)) {
        session = clone(snapshot);
        seenClientEventIds.add(record.clientEventId);
        appliedClientEventIds.push(record.clientEventId);
        continue;
      }
      skippedEventIds.push(record.id);
      continue;
    }

    const command = workoutSessionEventFromRecord(record);
    if (!command || !applyWorkoutSessionEventDraft(session, command)) {
      skippedEventIds.push(record.id);
      continue;
    }
    seenClientEventIds.add(record.clientEventId);
    appliedClientEventIds.push(record.clientEventId);
  }

  return {
    session,
    serverVersion,
    appliedClientEventIds,
    duplicateClientEventIds,
    skippedEventIds,
  };
}

export function replayWorkoutSessionEvents(
  initial: ActiveSession | null,
  events: WorkoutSessionEventRecord[],
): WorkoutSessionReplayResult {
  const first = replayOnce(initial, events);
  if (process.env.NODE_ENV !== "production") {
    const second = replayOnce(initial, events);
    if (stableJson(first.session) !== stableJson(second.session)) {
      throw new Error("Workout session replay is non-deterministic");
    }
  }
  return first;
}

/**
 * Minimal deterministic event replay. Server order (`sequenceNumber`) is the
 * canonical order, and duplicate `clientEventId` records are ignored.
 */
export function reduceWorkoutSessionEvents(
  initial: ActiveSession,
  events: WorkoutSessionEventRecord[],
): ActiveSession {
  return replayWorkoutSessionEvents(initial, events).session ?? initial;
}

export function outboxEventToRecord(
  event: WorkoutSessionOutboxEvent,
  sequenceNumber: number,
): WorkoutSessionEventRecord {
  return {
    id: event.id,
    sessionId: event.sessionId,
    userId: event.userId,
    eventType: event.eventType,
    payload: event.payload,
    clientEventId: event.clientEventId,
    deviceId: event.deviceId,
    sequenceNumber,
    createdAt: event.createdAt,
  };
}
