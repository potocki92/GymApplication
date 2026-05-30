import { toast } from "sonner";
import { create } from "zustand";

import {
  buildActiveSession,
  currentSet,
  nextCursor,
  suggestedReps,
  toCompletedSession,
  uid,
} from "@/lib/session-utils";
import {
  appendWorkoutSessionEvent,
  getActiveWorkoutSession,
  getWorkoutSessionEventsAfter,
  startWorkoutSession as startWorkoutSessionInSupabase,
} from "@/lib/supabase-workout-session-events";
import {
  isActiveSessionSnapshot,
  reduceWorkoutSessionEvents,
} from "@/lib/workout-session-event-reducer";
import { pl } from "@/lib/i18n/pl";
import type { WorkoutSessionEvent } from "@/features/workout-session/domain/workout-session-events";
import type {
  ActiveSession,
  CompletedSession,
  LoggedSet,
  Workout,
  WorkoutSessionJson,
} from "@/types";

const HISTORY_LIMIT = 30;

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function activeSessionToJson(session: ActiveSession): WorkoutSessionJson {
  return JSON.parse(JSON.stringify(session)) as WorkoutSessionJson;
}

/** Activate the set the cursor currently points at (start its timer, prefill actuals). */
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

function workoutSessionEventPayload(
  event: WorkoutSessionEvent,
): WorkoutSessionJson {
  return JSON.parse(JSON.stringify(event.payload)) as WorkoutSessionJson;
}

function isVersionConflict(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("version conflict")
  );
}

function nextPersistenceStatus(
  session: ActiveSession,
): "active" | "paused" | "completed" {
  if (session.status === "finished") return "completed";
  if (session.status === "paused") return "paused";
  return "active";
}

function buildEvent<T extends WorkoutSessionEvent["type"]>(
  sessionId: string,
  type: T,
  occurredAt: number,
  payload: Extract<WorkoutSessionEvent, { type: T }>["payload"],
  deviceId: string | null,
): Extract<WorkoutSessionEvent, { type: T }> {
  const clientEventId = `${sessionId}-${type.toLowerCase()}-${uid()}`;
  return {
    id: clientEventId,
    type,
    occurredAt,
    payload,
    clientEventId,
    deviceId,
  } as Extract<WorkoutSessionEvent, { type: T }>;
}

function applyActiveSessionEvent(
  session: ActiveSession,
  event: WorkoutSessionEvent,
): ActiveSession | null {
  const next = clone(session);
  const now = event.occurredAt;

  switch (event.type) {
    case "EXERCISE_STARTED": {
      const ex = next.exercises[event.payload.exerciseIndex];
      if (!ex || ex.id !== event.payload.exerciseId) return null;
      if (next.status !== "executing" && next.status !== "resting") return null;

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
      const exIndex = next.exercises.findIndex(
        (ex) => ex.id === event.payload.exerciseId,
      );
      if (exIndex < 0 || !next.exercises[exIndex].sets[event.payload.setIndex]) {
        return null;
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
      if (next.status !== "executing") return null;
      const exIndex = next.exercises.findIndex(
        (ex) => ex.id === event.payload.exerciseId,
      );
      const set = next.exercises[exIndex]?.sets[event.payload.setIndex];
      if (!set) return null;

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
      if (!target) return null;
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
      if (!ex) return null;
      const target = ex.sets[event.payload.setIndex];
      if (!target || target.status !== "pending") return null;
      if (
        next.exercises[next.currentExerciseIndex]?.id === event.payload.exerciseId &&
        next.currentSetIndex === event.payload.setIndex
      ) {
        return null;
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

    case "REST_STARTED": {
      next.status = "resting";
      next.restStartedAt = event.payload.startedAt ?? now;
      next.restTargetSec = Math.max(0, Math.round(event.payload.durationSec));
      break;
    }

    case "REST_FINISHED":
    case "REST_SKIPPED": {
      if (next.status !== "resting") return null;
      activateCurrentSet(
        next,
        event.type === "REST_FINISHED"
          ? event.payload.finishedAt ?? now
          : event.payload.skippedAt ?? now,
      );
      break;
    }

    case "WORKOUT_PAUSED": {
      if (next.status !== "executing" && next.status !== "resting") return null;
      next.pausedAt = event.payload.pausedAt ?? now;
      next.status = "paused";
      break;
    }

    case "WORKOUT_RESUMED": {
      if (next.status !== "paused" || next.pausedAt == null) return null;
      const resumedAt = event.payload.resumedAt ?? now;
      const delta = resumedAt - next.pausedAt;
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

    case "NOTE_ADDED": {
      const ex = event.payload.exerciseId
        ? next.exercises.find((item) => item.id === event.payload.exerciseId)
        : undefined;
      const target =
        ex && event.payload.setIndex != null ? ex.sets[event.payload.setIndex] : null;
      if (!target) return null;
      const trimmed = event.payload.note.trim();
      target.notes = trimmed === "" ? null : trimmed;
      break;
    }

    default:
      return null;
  }

  next.updatedAt = now;
  return next;
}

type ActiveSessionHydrationStatus = "idle" | "loading" | "ready" | "error";

interface ActiveSessionState {
  session: ActiveSession | null;
  activeSession: ActiveSession | null;
  serverVersion: number | null;
  hydrationStatus: ActiveSessionHydrationStatus;
  past: ActiveSession[];
  future: ActiveSession[];

  // lifecycle
  start: (workout: Workout) => void;
  startWorkoutSession: (workout: Workout) => Promise<ActiveSession | null>;
  beginFirstSet: () => void;
  pause: () => void;
  resume: () => void;
  abort: () => void;
  finishEarly: () => void;
  save: () => CompletedSession | null;

  // execution
  completeSet: () => void;
  skipRest: () => void;
  skipToNextExercise: () => void;

  // in-flight editing
  editCurrentSet: (
    patch: Partial<Pick<LoggedSet, "actualReps" | "actualWeightKg">>,
  ) => void;
  editSet: (
    exerciseIndex: number,
    setId: string,
    patch: Partial<Pick<LoggedSet, "actualReps" | "actualWeightKg" | "rpe" | "notes">>,
  ) => void;
  setRestForCurrentSet: (sec: number) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setId: string) => void;

  // history
  undo: () => void;
  redo: () => void;

  // recovery
  hydrate: (session: ActiveSession) => void;
  hydrateActiveWorkoutSession: () => Promise<void>;
}

export const useActiveSessionStore = create<ActiveSessionState>((set, get) => {
  async function applyServerSession(active: Awaited<ReturnType<typeof getActiveWorkoutSession>>): Promise<ActiveSession | null> {
    if (!active) return null;
    if (!isActiveSessionSnapshot(active.currentState)) {
      set({ serverVersion: active.version, hydrationStatus: "ready" });
      return null;
    }

    const events = await getWorkoutSessionEventsAfter(active.id, active.version);
    const session = reduceWorkoutSessionEvents(active.currentState, events);
    const serverVersion = events.at(-1)?.sequenceNumber ?? active.version;
    set({
      session,
      activeSession: session,
      serverVersion,
      hydrationStatus: "ready",
      past: [],
      future: [],
    });
    return session;
  }

  /**
   * Apply an immutable mutation to the session. `fn` mutates a deep clone; return
   * `false` to abort with no state change. When `pushHistory` is true the pre-edit
   * session is pushed onto the undo stack and the redo stack is cleared.
   */
  function commit(
    pushHistory: boolean,
    fn: (draft: ActiveSession) => boolean | void,
  ): void {
    const cur = get().session;
    if (!cur) return;
    const draft = clone(cur);
    if (fn(draft) === false) return;
    draft.updatedAt = Date.now();
    if (pushHistory) {
      set({
        session: draft,
        activeSession: draft,
        past: [...get().past, cur].slice(-HISTORY_LIMIT),
        future: [],
      });
    } else {
      set({ session: draft, activeSession: draft });
    }
  }

  async function commitEvent(
    pushHistory: boolean,
    event: WorkoutSessionEvent,
  ): Promise<void> {
    const cur = get().session;
    if (!cur) return;

    const next = applyActiveSessionEvent(cur, event);
    if (!next) return;

    const applyLocalState = (serverVersion: number | null) => {
      if (pushHistory) {
        set({
          session: next,
          activeSession: next,
          serverVersion,
          past: [...get().past, cur].slice(-HISTORY_LIMIT),
          future: [],
        });
      } else {
        set({ session: next, activeSession: next, serverVersion });
      }
    };

    const expectedVersion = get().serverVersion;
    if (expectedVersion == null) {
      applyLocalState(null);
      return;
    }

    try {
      const persisted = await appendWorkoutSessionEvent({
        sessionId: cur.id,
        eventType: event.type,
        payload: workoutSessionEventPayload(event),
        expectedVersion,
        nextState: activeSessionToJson(next),
        nextStatus: nextPersistenceStatus(next),
        clientEventId: event.clientEventId ?? event.id,
        deviceId: event.deviceId ?? null,
      });

      applyLocalState(persisted?.sequenceNumber ?? expectedVersion + 1);
    } catch (error) {
      if (isVersionConflict(error)) {
        toast.error(pl.errors.unexpectedTitle, {
          description: pl.errors.unexpectedDesc,
        });
        await get().hydrateActiveWorkoutSession();
        return;
      }

      toast.error(pl.errors.networkTitle, {
        description: pl.errors.networkDesc,
      });
      throw error;
    }
  }

  return {
    session: null,
    activeSession: null,
    serverVersion: null,
    hydrationStatus: "idle",
    past: [],
    future: [],

    start: (workout) => {
      const session = buildActiveSession(workout);
      set({ session, activeSession: session, past: [], future: [] });
    },

    startWorkoutSession: async (workout) => {
      const current = get().activeSession;
      if (current && current.status !== "finished") return current;

      const existing = await getActiveWorkoutSession();
      const existingSession = await applyServerSession(existing);
      if (existingSession) return existingSession;
      if (existing) return null;

      const session = buildActiveSession(workout);
      const clientEventId = `${session.id}-start-${uid()}`;

      try {
        const started = await startWorkoutSessionInSupabase({
          sessionId: session.id,
          workoutId: session.workoutId,
          workoutName: session.workoutName,
          deviceId: null,
          clientEventId,
          initialState: activeSessionToJson(session),
        });

        if (!started) {
          set({
            session,
            activeSession: session,
            serverVersion: null,
            hydrationStatus: "ready",
            past: [],
            future: [],
          });
          return session;
        }

        const serverSession = await applyServerSession(started);
        return serverSession ?? session;
      } catch (error) {
        const active = await getActiveWorkoutSession();
        const activeSession = await applyServerSession(active);
        if (activeSession) return activeSession;
        throw error;
      }
    },

    beginFirstSet: () => {
      const s = get().session;
      const firstExercise = s?.exercises[0];
      const firstSet = firstExercise?.sets[0];
      if (!s || s.status !== "planning" || !firstExercise || !firstSet) return;
      const now = Date.now();
      void commitEvent(
        true,
        buildEvent(
          s.id,
          "SET_STARTED",
          now,
          {
            exerciseId: firstExercise.id,
            setIndex: 0,
            startedAt: now,
            reps: suggestedReps(firstSet.targetReps),
            weightKg: firstSet.targetWeightKg,
          },
          null,
        ),
      );
    },

    completeSet: () => {
      const s = get().session;
      const set = s?.exercises[s.currentExerciseIndex]?.sets[s.currentSetIndex];
      const exercise = s?.exercises[s.currentExerciseIndex];
      if (!s || s.status !== "executing" || !set || !exercise) return;
      const now = Date.now();
      void commitEvent(
        true,
        buildEvent(
          s.id,
          "SET_COMPLETED",
          now,
          {
            exerciseId: exercise.id,
            setIndex: s.currentSetIndex,
            completedAt: now,
            reps: set.actualReps ?? suggestedReps(set.targetReps),
            weightKg: set.actualWeightKg ?? set.targetWeightKg,
            rpe: set.rpe,
            notes: set.notes,
          },
          null,
        ),
      );
    },

    skipRest: () => {
      const s = get().session;
      if (!s || s.status !== "resting") return;
      const now = Date.now();
      const restFinished =
        s.restStartedAt != null &&
        now - s.restStartedAt >= s.restTargetSec * 1000;
      void commitEvent(
        true,
        restFinished
          ? buildEvent(s.id, "REST_FINISHED", now, { finishedAt: now }, null)
          : buildEvent(s.id, "REST_SKIPPED", now, { skippedAt: now }, null),
      );
    },

    skipToNextExercise: () => {
      const s = get().session;
      if (!s || (s.status !== "executing" && s.status !== "resting")) return;

      for (let e = s.currentExerciseIndex + 1; e < s.exercises.length; e += 1) {
        if (s.exercises[e].sets.length > 0) {
          const now = Date.now();
          void commitEvent(
            true,
            buildEvent(
              s.id,
              "EXERCISE_STARTED",
              now,
              { exerciseId: s.exercises[e].id, exerciseIndex: e },
              null,
            ),
          );
          return;
        }
      }

      commit(true, (draft) => {
        if (draft.status !== "executing" && draft.status !== "resting") return false;
        const now = Date.now();
        const ex = draft.exercises[draft.currentExerciseIndex];
        if (!ex) return false;
        for (const st of ex.sets) {
          if (st.status === "pending" || st.status === "active") {
            st.status = "skipped";
          }
        }
        draft.status = "finished";
        draft.finishedAt = now;
        draft.restStartedAt = null;
      });
    },

    pause: () => {
      const s = get().session;
      if (!s || (s.status !== "executing" && s.status !== "resting")) return;
      const now = Date.now();
      void commitEvent(
        false,
        buildEvent(s.id, "WORKOUT_PAUSED", now, { pausedAt: now }, null),
      );
    },

    resume: () => {
      const s = get().session;
      if (!s || s.status !== "paused" || s.pausedAt == null) return;
      const now = Date.now();
      void commitEvent(
        false,
        buildEvent(s.id, "WORKOUT_RESUMED", now, { resumedAt: now }, null),
      );
    },

    finishEarly: () =>
      commit(true, (s) => {
        if (s.status === "finished" || s.status === "planning") return false;
        const now = Date.now();
        for (const ex of s.exercises) {
          for (const st of ex.sets) {
            if (st.status === "pending" || st.status === "active") {
              st.status = "skipped";
            }
          }
        }
        s.status = "finished";
        s.finishedAt = now;
        s.restStartedAt = null;
        s.pausedAt = null;
      }),

    abort: () =>
      set({ session: null, activeSession: null, serverVersion: null, past: [], future: [] }),

    save: () => {
      const s = get().session;
      if (!s || s.status !== "finished") return null;
      const completed = toCompletedSession(s);
      set({ session: null, activeSession: null, serverVersion: null, past: [], future: [] });
      return completed;
    },

    editCurrentSet: (patch) => {
      const s = get().session;
      if (!s) return;
      const exercise = s.exercises[s.currentExerciseIndex];
      const target = exercise?.sets[s.currentSetIndex];
      if (!exercise || !target) return;
      const now = Date.now();
      void commitEvent(
        true,
        buildEvent(
          s.id,
          "SET_UPDATED",
          now,
          {
            exerciseId: exercise.id,
            setIndex: s.currentSetIndex,
            reps:
              patch.actualReps == null
                ? undefined
                : Math.max(0, Math.round(patch.actualReps)),
            weightKg:
              patch.actualWeightKg == null
                ? undefined
                : Math.max(0, patch.actualWeightKg),
          },
          null,
        ),
      );
    },

    editSet: (exerciseIndex, setId, patch) => {
      const s = get().session;
      const exercise = s?.exercises[exerciseIndex];
      const setIndex = exercise?.sets.findIndex((x) => x.id === setId) ?? -1;
      if (!s || !exercise || setIndex < 0) return;
      const now = Date.now();
      const hasOnlyNote =
        patch.notes !== undefined &&
        patch.actualReps === undefined &&
        patch.actualWeightKg === undefined &&
        patch.rpe === undefined;

      if (hasOnlyNote) {
        void commitEvent(
          true,
          buildEvent(
            s.id,
            "NOTE_ADDED",
            now,
            {
              note: patch.notes ?? "",
              createdAt: now,
              exerciseId: exercise.id,
              setIndex,
            },
            null,
          ),
        );
        return;
      }

      void commitEvent(
        true,
        buildEvent(
          s.id,
          "SET_UPDATED",
          now,
          {
            exerciseId: exercise.id,
            setIndex,
            reps:
              patch.actualReps == null
                ? undefined
                : Math.max(0, Math.round(patch.actualReps)),
            weightKg:
              patch.actualWeightKg == null
                ? undefined
                : Math.max(0, patch.actualWeightKg),
            rpe:
              patch.rpe === undefined
                ? undefined
                : patch.rpe == null
                  ? null
                  : Math.max(1, Math.min(10, Math.round(patch.rpe))),
            notes:
              patch.notes === undefined
                ? undefined
                : (patch.notes?.trim() ?? "") === ""
                  ? null
                  : patch.notes?.trim(),
          },
          null,
        ),
      );
    },

    setRestForCurrentSet: (sec) => {
      const s = get().session;
      if (!s) return;
      const clamped = Math.max(0, Math.round(sec));
      const now = Date.now();

      if (s.status === "resting") {
        void commitEvent(
          true,
          buildEvent(
            s.id,
            "REST_STARTED",
            now,
            {
              durationSec: clamped,
              startedAt: now,
              exerciseId: s.exercises[s.currentExerciseIndex]?.id,
              setIndex: s.currentSetIndex,
            },
            null,
          ),
        );
        return;
      }

      const exercise = s.exercises[s.currentExerciseIndex];
      if (!exercise?.sets[s.currentSetIndex]) return;
      void commitEvent(
        true,
        buildEvent(
          s.id,
          "SET_UPDATED",
          now,
          {
            exerciseId: exercise.id,
            setIndex: s.currentSetIndex,
            restTargetSec: clamped,
          },
          null,
        ),
      );
    },

    addSet: (exerciseIndex) =>
      commit(true, (s) => {
        const ex = s.exercises[exerciseIndex];
        if (!ex) return false;
        const last = ex.sets[ex.sets.length - 1];
        const num = ex.sets.length + 1;
        ex.sets.push({
          id: `${ex.id}-set-${num}-${uid()}`,
          setNumber: num,
          status: "pending",
          targetReps: ex.targetReps,
          targetWeightKg: last?.targetWeightKg ?? ex.targetWeightKg,
          actualReps: null,
          actualWeightKg: null,
          restTargetSec: last?.restTargetSec ?? 0,
          startedAt: null,
          completedAt: null,
          rpe: null,
          notes: null,
        });
      }),

    removeSet: (exerciseIndex, setId) => {
      const s = get().session;
      const exercise = s?.exercises[exerciseIndex];
      const setIndex = exercise?.sets.findIndex((x) => x.id === setId) ?? -1;
      const target = setIndex >= 0 ? exercise?.sets[setIndex] : null;
      if (!s || !exercise || !target || target.status !== "pending") return;
      if (exerciseIndex === s.currentExerciseIndex && setIndex === s.currentSetIndex) {
        return;
      }
      const now = Date.now();
      void commitEvent(
        true,
        buildEvent(
          s.id,
          "SET_DELETED",
          now,
          { exerciseId: exercise.id, setIndex },
          null,
        ),
      );
    },

    undo: () => {
      const { past, session, future } = get();
      if (past.length === 0 || !session) return;
      const prev = past[past.length - 1];
      set({
        session: prev,
        activeSession: prev,
        past: past.slice(0, -1),
        future: [session, ...future].slice(0, HISTORY_LIMIT),
      });
    },

    redo: () => {
      const { past, session, future } = get();
      if (future.length === 0 || !session) return;
      const next = future[0];
      set({
        session: next,
        activeSession: next,
        past: [...past, session].slice(-HISTORY_LIMIT),
        future: future.slice(1),
      });
    },

    hydrate: (session) => set({ session, activeSession: session, past: [], future: [] }),

    hydrateActiveWorkoutSession: async () => {
      set({ hydrationStatus: "loading" });
      try {
        const active = await getActiveWorkoutSession();
        if (!active) {
          if (get().activeSession) {
            set({ hydrationStatus: "ready" });
            return;
          }
          set({
            session: null,
            activeSession: null,
            serverVersion: null,
            hydrationStatus: "ready",
            past: [],
            future: [],
          });
          return;
        }

        const session = await applyServerSession(active);
        if (!session) {
          set({
            session: null,
            activeSession: null,
            serverVersion: active.version,
            hydrationStatus: "ready",
            past: [],
            future: [],
          });
        }
      } catch (error) {
        console.error("Failed to hydrate active workout session", error);
        set({ hydrationStatus: "error" });
      }
    },
  };
});
