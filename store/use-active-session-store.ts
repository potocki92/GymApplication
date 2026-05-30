import { toast } from "sonner";
import { create } from "zustand";

import { getSupabaseClient } from "@/lib/supabase/client";

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
import {
  clearSession as clearCachedSession,
  loadSessionSnapshot,
  saveSessionSnapshot,
  type ActiveSessionCacheSnapshot,
} from "@/lib/idb-session";
import {
  cleanupWorkoutSessionOutbox,
  listSyncableWorkoutSessionOutboxEvents,
  listWorkoutSessionOutboxEvents,
  putWorkoutSessionOutboxEvent,
  resetStaleSyncingWorkoutSessionOutboxEvents,
  updateWorkoutSessionOutboxEvent,
} from "@/lib/idb-workout-session-outbox";
import type { WorkoutSessionEvent } from "@/features/workout-session/domain/workout-session-events";
import type {
  ActiveSession,
  CompletedSession,
  LoggedSet,
  Workout,
  WorkoutSessionJson,
  WorkoutSessionOutboxEvent,
} from "@/types";

const HISTORY_LIMIT = 30;
const OFFLINE_USER_ID = "offline-user";
const RESUMABLE_STATUSES = new Set<ActiveSession["status"]>([
  "planning",
  "executing",
  "resting",
  "paused",
]);

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
  nextState?: ActiveSession,
): WorkoutSessionJson {
  const payload = JSON.parse(JSON.stringify(event.payload)) as Record<string, WorkoutSessionJson>;
  if (nextState) payload.nextState = activeSessionToJson(nextState);
  return payload as WorkoutSessionJson;
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

    case "WORKOUT_FINISHED": {
      if (next.status === "finished" || next.status === "planning") return null;
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
  pendingSync: boolean;
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
  syncOutbox: (sessionId?: string) => Promise<void>;
}

export const useActiveSessionStore = create<ActiveSessionState>((set, get) => {
  let hydrationRun = 0;
  let eventQueue = Promise.resolve();
  const syncLocks = new Map<string, Promise<void>>();
  const syncTimeouts = new Map<string, number>();

  function isOnline(): boolean {
    return typeof navigator === "undefined" || navigator.onLine;
  }

  async function currentOutboxUserId(): Promise<string> {
    const supabase = getSupabaseClient();
    if (!supabase) return OFFLINE_USER_ID;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return OFFLINE_USER_ID;
      return data.session?.user.id ?? OFFLINE_USER_ID;
    } catch {
      return OFFLINE_USER_ID;
    }
  }

  function outboxError(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown sync error";
  }

  function backoffMs(retryCount: number): number {
    return Math.min(30_000, 500 * 2 ** Math.max(0, retryCount));
  }

  async function nextLocalSequenceNumber(sessionId: string, baseVersion: number): Promise<number> {
    const events = await listWorkoutSessionOutboxEvents(sessionId);
    return Math.max(baseVersion, ...events.map((event) => event.localSequenceNumber)) + 1;
  }

  function persistLocalSession(
    session: ActiveSession | null,
    serverVersion = get().serverVersion,
    dirty = get().pendingSync,
  ): void {
    if (!session || !RESUMABLE_STATUSES.has(session.status)) return;
    void saveSessionSnapshot(session, { serverVersion, dirty });
  }

  async function resolveServerSession(
    active: Awaited<ReturnType<typeof getActiveWorkoutSession>>,
  ): Promise<{ session: ActiveSession; serverVersion: number } | null> {
    if (!active || !isActiveSessionSnapshot(active.currentState)) return null;

    const events = await getWorkoutSessionEventsAfter(active.id, active.version);
    const session = reduceWorkoutSessionEvents(active.currentState, events);
    const serverVersion = events.at(-1)?.sequenceNumber ?? active.version;
    return { session, serverVersion };
  }

  function applySessionState(
    session: ActiveSession | null,
    serverVersion: number | null,
    pendingSync: boolean,
    hydrationStatus: ActiveSessionHydrationStatus,
  ): void {
    set({
      session,
      activeSession: session,
      serverVersion,
      pendingSync,
      hydrationStatus,
      past: [],
      future: [],
    });
    if (session) {
      persistLocalSession(session, serverVersion, pendingSync);
    }
  }

  function localVersion(snapshot: ActiveSessionCacheSnapshot | null): number | null {
    return snapshot?.serverVersion ?? null;
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
    const serverVersion = get().serverVersion;
    if (pushHistory) {
      set({
        session: draft,
        activeSession: draft,
        pendingSync: true,
        past: [...get().past, cur].slice(-HISTORY_LIMIT),
        future: [],
      });
    } else {
      set({ session: draft, activeSession: draft, pendingSync: true });
    }
    persistLocalSession(draft, serverVersion, true);
  }

  async function appendOutboxEvent(
    event: WorkoutSessionEvent,
    next: ActiveSession,
    baseVersion: number,
  ): Promise<WorkoutSessionOutboxEvent> {
    const outboxEvent: WorkoutSessionOutboxEvent = {
      id: event.clientEventId ?? event.id,
      sessionId: next.id,
      userId: await currentOutboxUserId(),
      eventType: event.type,
      payload: workoutSessionEventPayload(event, next),
      clientEventId: event.clientEventId ?? event.id,
      deviceId: event.deviceId ?? null,
      baseVersion,
      localSequenceNumber: await nextLocalSequenceNumber(next.id, baseVersion),
      createdAt: event.occurredAt,
      syncStatus: "pending",
      retryCount: 0,
      lastError: null,
    };
    await putWorkoutSessionOutboxEvent(outboxEvent);
    return outboxEvent;
  }

  async function commitEvent(
    pushHistory: boolean,
    event: WorkoutSessionEvent,
  ): Promise<void> {
    if (get().serverVersion == null) {
      await commitEventNow(pushHistory, event);
      return;
    }
    const run = eventQueue.catch(() => undefined).then(() =>
      commitEventNow(pushHistory, event),
    );
    eventQueue = run.catch(() => undefined);
    await run;
  }

  async function commitEventNow(
    pushHistory: boolean,
    event: WorkoutSessionEvent,
  ): Promise<void> {
    const cur = get().session;
    if (!cur) return;

    const next = applyActiveSessionEvent(cur, event);
    if (!next) return;

    const baseVersion = get().serverVersion ?? 0;
    if (pushHistory) {
      set({
        session: next,
        activeSession: next,
        pendingSync: true,
        past: [...get().past, cur].slice(-HISTORY_LIMIT),
        future: [],
      });
    } else {
      set({ session: next, activeSession: next, pendingSync: true });
    }
    persistLocalSession(next, baseVersion || null, true);

    try {
      await appendOutboxEvent(event, next, baseVersion);
    } catch (error) {
      toast.error(pl.errors.unexpectedTitle, {
        description: outboxError(error),
      });
      return;
    }

    void syncSessionOutbox(next.id);
  }

  function payloadRecord(payload: WorkoutSessionJson): Record<string, WorkoutSessionJson> {
    return payload != null && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
  }

  function payloadSnapshot(payload: WorkoutSessionJson): ActiveSession | null {
    const state = payloadRecord(payload).nextState;
    return isActiveSessionSnapshot(state) ? state : null;
  }

  async function syncSessionOutbox(sessionId: string): Promise<void> {
    const pendingTimeout = syncTimeouts.get(sessionId);
    if (pendingTimeout != null) {
      window.clearTimeout(pendingTimeout);
      syncTimeouts.delete(sessionId);
    }

    const existing = syncLocks.get(sessionId);
    if (existing) return existing;

    const run = (async () => {
      if (!isOnline()) return;
      await resetStaleSyncingWorkoutSessionOutboxEvents();
      const events = await listSyncableWorkoutSessionOutboxEvents(sessionId);
      if (events.length === 0) {
        if (get().session?.id === sessionId) {
          set({ pendingSync: false });
          persistLocalSession(get().session, get().serverVersion, false);
        }
        return;
      }

      let serverVersion = get().session?.id === sessionId ? get().serverVersion : null;
      const active = await getActiveWorkoutSession();
      if (active?.id === sessionId) serverVersion = active.version;

      for (const event of events) {
        const current = await updateWorkoutSessionOutboxEvent(event.id, {
          syncStatus: "syncing",
          syncStartedAt: Date.now(),
          lastError: null,
        });
        if (!current) continue;

        try {
          const nextState = payloadSnapshot(current.payload);
          if (!nextState) throw new Error("Outbox event is missing nextState snapshot");

          if (current.eventType === "WORKOUT_STARTED") {
            const payload = payloadRecord(current.payload);
            const started = await startWorkoutSessionInSupabase({
              sessionId: current.sessionId,
              workoutId: String(payload.workoutId ?? nextState.workoutId),
              workoutName: String(payload.workoutName ?? nextState.workoutName),
              deviceId: current.deviceId,
              clientEventId: current.clientEventId,
              initialState: activeSessionToJson(nextState),
            });
            serverVersion = started?.version ?? 1;
          } else {
            const expectedVersion = serverVersion ?? current.baseVersion;
            const persisted = await appendWorkoutSessionEvent({
              sessionId: current.sessionId,
              eventType: current.eventType,
              payload: current.payload,
              expectedVersion,
              nextState: activeSessionToJson(nextState),
              nextStatus: nextPersistenceStatus(nextState),
              clientEventId: current.clientEventId,
              deviceId: current.deviceId,
            });
            serverVersion = persisted?.sequenceNumber ?? expectedVersion + 1;
          }

          await updateWorkoutSessionOutboxEvent(current.id, {
            syncStatus: "synced",
            syncStartedAt: null,
            lastError: null,
          });
          if (get().session?.id === sessionId) {
            set({ serverVersion, pendingSync: true });
            persistLocalSession(get().session, serverVersion, true);
          }
        } catch (error) {
          if (isVersionConflict(error)) {
            await updateWorkoutSessionOutboxEvent(current.id, {
              syncStatus: "conflict",
              syncStartedAt: null,
              lastError: outboxError(error),
            });
            set({ pendingSync: true });
            await get().hydrateActiveWorkoutSession();
            return;
          }

          const retryCount = current.retryCount + 1;
          await updateWorkoutSessionOutboxEvent(current.id, {
            syncStatus: "failed",
            syncStartedAt: null,
            retryCount,
            lastError: outboxError(error),
          });
          set({ pendingSync: true });
          if (isOnline()) {
            const timeoutId = window.setTimeout(() => {
              syncTimeouts.delete(sessionId);
              void syncSessionOutbox(sessionId);
            }, backoffMs(retryCount));
            syncTimeouts.set(sessionId, timeoutId);
          }
          return;
        }
      }

      const remaining = await listSyncableWorkoutSessionOutboxEvents(sessionId);
      const pendingSync = remaining.length > 0;
      if (get().session?.id === sessionId) {
        set({ pendingSync });
        persistLocalSession(get().session, serverVersion, pendingSync);
      }
      await cleanupWorkoutSessionOutbox({ activeSessionIds: [sessionId] });
    })().finally(() => {
      syncLocks.delete(sessionId);
    });

    syncLocks.set(sessionId, run);
    return run;
  }

  async function startLocalSession(workout: Workout): Promise<ActiveSession> {
    const session = buildActiveSession(workout);
    const now = session.startedAt ?? Date.now();
    const clientEventId = `${session.id}-start-${uid()}`;
    const event: WorkoutSessionEvent = {
      id: clientEventId,
      type: "WORKOUT_STARTED",
      occurredAt: now,
      payload: {
        sessionId: session.id,
        workoutId: session.workoutId,
        workoutName: session.workoutName,
        startedAt: now,
      },
      clientEventId,
      deviceId: null,
    };
    await appendOutboxEvent(event, session, 0);
    applySessionState(session, null, true, "ready");
    await syncSessionOutbox(session.id);
    return session;
  }


  return {
    session: null,
    activeSession: null,
    serverVersion: null,
    pendingSync: false,
    hydrationStatus: "idle",
    past: [],
    future: [],

    start: (workout) => {
      const session = buildActiveSession(workout);
      applySessionState(session, null, true, "ready");
    },

    startWorkoutSession: async (workout) => {
      const current = get().activeSession;
      if (current && current.status !== "finished") return current;

      try {
        const existing = await getActiveWorkoutSession();
        const existingSession = await resolveServerSession(existing);
        if (existingSession) {
          applySessionState(
            existingSession.session,
            existingSession.serverVersion,
            false,
            "ready",
          );
          await cleanupWorkoutSessionOutbox({ activeSessionIds: [existingSession.session.id] });
          return existingSession.session;
        }
        if (existing) return null;
      } catch {
        // Network/auth failures should not block starting a durable local session.
      }

      return startLocalSession(workout);
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

    finishEarly: () => {
      const s = get().session;
      if (!s || s.status === "finished" || s.status === "planning") return;
      const now = Date.now();
      void commitEvent(
        true,
        buildEvent(s.id, "WORKOUT_FINISHED", now, { finishedAt: now }, null),
      );
    },

    abort: () => {
      const id = get().session?.id;
      set({
        session: null,
        activeSession: null,
        serverVersion: null,
        pendingSync: false,
        past: [],
        future: [],
      });
      if (id) void clearCachedSession(id);
    },

    save: () => {
      const s = get().session;
      if (!s || s.status !== "finished") return null;
      const completed = toCompletedSession(s);
      set({
        session: null,
        activeSession: null,
        serverVersion: null,
        pendingSync: false,
        past: [],
        future: [],
      });
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

    hydrate: (session) => {
      applySessionState(session, null, true, "ready");
    },

    hydrateActiveWorkoutSession: async () => {
      const run = ++hydrationRun;
      set({ hydrationStatus: "loading" });
      let localSnapshot: ActiveSessionCacheSnapshot | null = null;

      try {
        await resetStaleSyncingWorkoutSessionOutboxEvents();
        localSnapshot = await loadSessionSnapshot();
        if (run !== hydrationRun) return;

        if (localSnapshot) {
          const currentVersion = get().serverVersion;
          const cachedVersion = localVersion(localSnapshot);
          const shouldApplyLocal =
            get().session == null ||
            currentVersion == null ||
            cachedVersion == null ||
            cachedVersion >= currentVersion;

          if (shouldApplyLocal) {
            set({
              session: localSnapshot.session,
              activeSession: localSnapshot.session,
              serverVersion: cachedVersion,
              pendingSync: localSnapshot.dirty,
              hydrationStatus: "loading",
              past: [],
              future: [],
            });
          }
        }

        const active = await getActiveWorkoutSession();
        if (run !== hydrationRun) return;

        if (!active) {
          if (localSnapshot?.dirty || get().pendingSync) {
            set({ hydrationStatus: "ready", pendingSync: true });
            return;
          }

          const cachedId = localSnapshot?.session.id;
          applySessionState(null, null, false, "ready");
          if (cachedId) void clearCachedSession(cachedId);
          return;
        }

        const resolved = await resolveServerSession(active);
        if (run !== hydrationRun) return;

        if (!resolved) {
          if (localSnapshot?.dirty || get().pendingSync) {
            set({ serverVersion: active.version, hydrationStatus: "ready" });
            return;
          }

          applySessionState(null, active.version, false, "ready");
          if (localSnapshot?.session.id) {
            void clearCachedSession(localSnapshot.session.id);
          }
          return;
        }

        const cachedVersion = localVersion(localSnapshot) ?? get().serverVersion;
        const hasPendingLocal = localSnapshot?.dirty || get().pendingSync;

        if (
          cachedVersion != null &&
          cachedVersion > resolved.serverVersion
        ) {
          set({
            session: localSnapshot?.session ?? get().session,
            activeSession: localSnapshot?.session ?? get().activeSession,
            serverVersion: cachedVersion,
            pendingSync: true,
            hydrationStatus: "ready",
            past: [],
            future: [],
          });
          persistLocalSession(localSnapshot?.session ?? get().session, cachedVersion, true);
          if (localSnapshot?.session.id) void syncSessionOutbox(localSnapshot.session.id);
          return;
        }

        if (hasPendingLocal && cachedVersion === resolved.serverVersion) {
          set({ hydrationStatus: "ready", pendingSync: true });
          persistLocalSession(get().session, cachedVersion, true);
          const currentSession = get().session;
          if (currentSession) void syncSessionOutbox(currentSession.id);
          return;
        }

        applySessionState(
          resolved.session,
          resolved.serverVersion,
          false,
          "ready",
        );
        void syncSessionOutbox(resolved.session.id);
      } catch (error) {
        console.error("Failed to hydrate active workout session", error);
        if (run === hydrationRun) set({ hydrationStatus: "error" });
      }
    },

    syncOutbox: async (sessionId) => {
      const targetSessionId = sessionId ?? get().session?.id;
      if (targetSessionId) {
        await syncSessionOutbox(targetSessionId);
        return;
      }

      await resetStaleSyncingWorkoutSessionOutboxEvents();
      const events = await listWorkoutSessionOutboxEvents();
      const sessionIds = Array.from(new Set(events.map((event) => event.sessionId)));
      for (const id of sessionIds) await syncSessionOutbox(id);
    },
  };
});
