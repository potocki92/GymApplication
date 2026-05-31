import { toast } from "sonner";
import { create } from "zustand";

import { getSupabaseClient } from "@/lib/supabase/client";

import {
  buildActiveSession,
  suggestedReps,
  toCompletedSession,
  uid,
} from "@/lib/session-utils";
import {
  appendWorkoutSessionEvent,
  completeWorkoutSession,
  getActiveWorkoutSession,
  getWorkoutSessionById,
  getWorkoutSessionEventsAfter,
  startWorkoutSession as startWorkoutSessionInSupabase,
} from "@/lib/supabase-workout-session-events";
import { getWorkoutSessionDeviceId } from "@/lib/workout-session-device";
import { cloneSerializable, isJsonRecord, toWorkoutSessionJson } from "@/lib/workout-session-serialization";
import {
  applyWorkoutSessionEvent,
  isActiveSessionSnapshot,
  outboxEventToRecord,
  replayWorkoutSessionEvents,
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
  Exercise,
  LoggedSet,
  Workout,
  WorkoutSessionJson,
  WorkoutSessionOutboxEvent,
  WorkoutSessionEventRecord,
} from "@/types";

const HISTORY_LIMIT = 30;
const OFFLINE_USER_ID = "offline-user";
const RESUMABLE_STATUSES = new Set<ActiveSession["status"]>([
  "planning",
  "executing",
  "resting",
  "paused",
]);
const LOCAL_CLIENT_EVENT_ID_LIMIT = 1024;
const AUTO_RETRY_LIMIT = 8;

function clone<T>(value: T): T {
  return cloneSerializable(value);
}

function activeSessionToJson(session: ActiveSession): WorkoutSessionJson {
  return toWorkoutSessionJson(session);
}

function workoutSessionEventPayload(
  event: WorkoutSessionEvent,
): WorkoutSessionJson {
  return toWorkoutSessionJson(event.payload);
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

function setSyncTimeout(handler: () => void, timeout: number): number {
  return globalThis.setTimeout(handler, timeout) as unknown as number;
}

function clearSyncTimeout(id: number): void {
  globalThis.clearTimeout(id);
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
  /** Add a catalog exercise to the current session only (never touches the plan). */
  addExerciseToSession: (exercise: Exercise) => void;

  // history
  undo: () => void;
  redo: () => void;

  // recovery
  hydrate: (session: ActiveSession) => void;
  hydrateActiveWorkoutSession: () => Promise<void>;
  syncOutbox: (sessionId?: string) => Promise<void>;
  applyRemoteWorkoutSessionEvents: (events: WorkoutSessionEventRecord[]) => Promise<void>;
  getRealtimeSyncState: () => {
    sessionId: string | null;
    serverVersion: number | null;
    hydrationReady: boolean;
    deviceId: string | null;
    ownClientEventIds: ReadonlySet<string>;
  };
}

export const useActiveSessionStore = create<ActiveSessionState>((set, get) => {
  let hydrationRun = 0;
  let eventQueue = Promise.resolve();
  const syncLocks = new Map<string, Promise<void>>();
  const syncTimeouts = new Map<string, number>();
  const localClientEventIds = new Set<string>();

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

  function rememberLocalClientEventId(clientEventId: string): void {
    localClientEventIds.delete(clientEventId);
    localClientEventIds.add(clientEventId);
    while (localClientEventIds.size > LOCAL_CLIENT_EVENT_ID_LIMIT) {
      const oldest = localClientEventIds.values().next().value;
      if (typeof oldest !== "string") break;
      localClientEventIds.delete(oldest);
    }
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
    options: { requireEventLog?: boolean } = {},
  ): Promise<{ session: ActiveSession; serverVersion: number } | null> {
    if (!active) return null;

    const events = await getWorkoutSessionEventsAfter(active.id, 0);
    const replayed = replayWorkoutSessionEvents(null, events);
    if (replayed.session) {
      return {
        session: replayed.session,
        serverVersion: Math.max(active.version, replayed.serverVersion),
      };
    }

    if (options.requireEventLog || !isActiveSessionSnapshot(active.currentState)) {
      return null;
    }

    const missingEvents = await getWorkoutSessionEventsAfter(active.id, active.version);
    const session = reduceWorkoutSessionEvents(active.currentState, missingEvents);
    const serverVersion = missingEvents.at(-1)?.sequenceNumber ?? active.version;
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
      payload: workoutSessionEventPayload(event),
      nextState: activeSessionToJson(next),
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
    rememberLocalClientEventId(outboxEvent.clientEventId);
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

    const next = applyWorkoutSessionEvent(cur, event);
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
    return isJsonRecord(payload) ? payload : {};
  }

  function outboxSnapshot(event: WorkoutSessionOutboxEvent): ActiveSession | null {
    if (isActiveSessionSnapshot(event.nextState)) return event.nextState;
    const legacyState = payloadRecord(event.payload).nextState;
    return isActiveSessionSnapshot(legacyState) ? legacyState : null;
  }

  async function recoverOutboxConflict(sessionId: string): Promise<boolean> {
    const latestRemote = await getWorkoutSessionById(sessionId);
    if (!latestRemote) return false;

    const remoteEvents = await getWorkoutSessionEventsAfter(sessionId, 0);
    const remoteReplay = replayWorkoutSessionEvents(null, remoteEvents);
    if (!remoteReplay.session) return false;

    const acceptedClientEventIds = new Set(remoteReplay.appliedClientEventIds);
    const localEvents = await listWorkoutSessionOutboxEvents(sessionId);
    let merged = remoteReplay.session;
    const remoteVersion = Math.max(latestRemote.version, remoteReplay.serverVersion);
    let nextLocalSequence = remoteVersion;
    let hasPendingLocal = false;

    for (const event of localEvents) {
      if (event.syncStatus === "synced") continue;

      if (acceptedClientEventIds.has(event.clientEventId)) {
        await updateWorkoutSessionOutboxEvent(event.id, {
          syncStatus: "synced",
          syncStartedAt: null,
          lastError: null,
        });
        continue;
      }

      const replay = replayWorkoutSessionEvents(
        merged,
        [outboxEventToRecord(event, nextLocalSequence + 1)],
      );

      if (!replay.session || replay.skippedEventIds.includes(event.id)) {
        hasPendingLocal = true;
        await updateWorkoutSessionOutboxEvent(event.id, {
          syncStatus: "conflict",
          syncStartedAt: null,
          lastError: "Unresolved conflict: the remote event log made this local event obsolete",
        });
        continue;
      }

      merged = replay.session;
      nextLocalSequence += 1;
      hasPendingLocal = true;
      acceptedClientEventIds.add(event.clientEventId);
      await updateWorkoutSessionOutboxEvent(event.id, {
        nextState: activeSessionToJson(merged),
        baseVersion: nextLocalSequence - 1,
        localSequenceNumber: nextLocalSequence,
        syncStatus: "pending",
        syncStartedAt: null,
        lastError: null,
      });
    }

    if (get().session?.id === sessionId || get().session == null) {
      set({
        session: merged,
        activeSession: merged,
        serverVersion: remoteVersion,
        pendingSync: hasPendingLocal,
        hydrationStatus: "ready",
        past: [],
        future: [],
      });
      persistLocalSession(merged, remoteVersion, hasPendingLocal);
    }

    return true;
  }

  async function syncSessionOutbox(sessionId: string): Promise<void> {
    const pendingTimeout = syncTimeouts.get(sessionId);
    if (pendingTimeout != null) {
      clearSyncTimeout(pendingTimeout);
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
          const allEvents = await listWorkoutSessionOutboxEvents(sessionId);
          const pendingSync = allEvents.some((event) => event.syncStatus !== "synced");
          set({ pendingSync });
          persistLocalSession(get().session, get().serverVersion, pendingSync);
        }
        return;
      }

      let serverVersion = get().session?.id === sessionId ? get().serverVersion : null;
      const active = await getActiveWorkoutSession();
      if (active?.id === sessionId) {
        const localKnownVersion = serverVersion ?? events[0]?.baseVersion ?? 0;
        if (active.version > localKnownVersion) {
          const recovered = await recoverOutboxConflict(sessionId);
          if (recovered) {
            set({ pendingSync: true });
            const timeoutId = setSyncTimeout(() => {
              syncTimeouts.delete(sessionId);
              void syncSessionOutbox(sessionId);
            }, 0);
            syncTimeouts.set(sessionId, timeoutId);
            return;
          }
        }
        serverVersion = Math.max(serverVersion ?? 0, active.version);
      }

      for (const event of events) {
        const current = await updateWorkoutSessionOutboxEvent(event.id, {
          syncStatus: "syncing",
          syncStartedAt: Date.now(),
          lastError: null,
        });
        if (!current) continue;

        try {
          const nextState = outboxSnapshot(current);
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
            const guardedVersion = Math.max(get().serverVersion ?? 0, serverVersion ?? 0);
            set({ serverVersion: guardedVersion, pendingSync: true });
            persistLocalSession(get().session, guardedVersion, true);
          }
        } catch (error) {
          if (isVersionConflict(error)) {
            const recovered = await recoverOutboxConflict(sessionId);
            if (recovered) {
              set({ pendingSync: true });
              const timeoutId = setSyncTimeout(() => {
                syncTimeouts.delete(sessionId);
                void syncSessionOutbox(sessionId);
              }, 0);
              syncTimeouts.set(sessionId, timeoutId);
              return;
            }

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
          if (isOnline() && retryCount <= AUTO_RETRY_LIMIT) {
            const timeoutId = setSyncTimeout(() => {
              syncTimeouts.delete(sessionId);
              void syncSessionOutbox(sessionId);
            }, backoffMs(retryCount));
            syncTimeouts.set(sessionId, timeoutId);
          }
          return;
        }
      }

      const remaining = await listWorkoutSessionOutboxEvents(sessionId);
      const pendingSync = remaining.some((event) => event.syncStatus !== "synced");
      if (get().session?.id === sessionId) {
        const guardedVersion = Math.max(get().serverVersion ?? 0, serverVersion ?? 0);
        set({ serverVersion: guardedVersion, pendingSync });
        persistLocalSession(get().session, guardedVersion, pendingSync);
      }
      await cleanupWorkoutSessionOutbox({ activeSessionIds: [sessionId] });
    })().finally(() => {
      syncLocks.delete(sessionId);
    });

    syncLocks.set(sessionId, run);
    return run;
  }

  async function applyRemoteWorkoutSessionEventsNow(
    events: WorkoutSessionEventRecord[],
  ): Promise<void> {
    const current = get().session;
    if (!current || get().hydrationStatus !== "ready") return;

    const relevant = events
      .filter((event) => event.sessionId === current.id)
      .filter((event) => event.sequenceNumber > (get().serverVersion ?? 0))
      .filter((event) => !localClientEventIds.has(event.clientEventId));
    if (relevant.length === 0) return;

    if (get().pendingSync) {
      const recovered = await recoverOutboxConflict(current.id);
      if (recovered) {
        void syncSessionOutbox(current.id);
      }
      return;
    }

    const replay = replayWorkoutSessionEvents(current, relevant);
    if (!replay.session) return;

    const nextVersion = Math.max(get().serverVersion ?? 0, replay.serverVersion);
    if (nextVersion <= (get().serverVersion ?? 0)) return;

    set({
      session: replay.session,
      activeSession: replay.session,
      serverVersion: nextVersion,
      pendingSync: false,
      past: [],
      future: [],
    });
    persistLocalSession(replay.session, nextVersion, false);
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
      deviceId: getWorkoutSessionDeviceId(),
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
          getWorkoutSessionDeviceId(),
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
          getWorkoutSessionDeviceId(),
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
          ? buildEvent(s.id, "REST_FINISHED", now, { finishedAt: now }, getWorkoutSessionDeviceId())
          : buildEvent(s.id, "REST_SKIPPED", now, { skippedAt: now }, getWorkoutSessionDeviceId()),
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
              getWorkoutSessionDeviceId(),
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
      // Finishing here is a local-only commit — finalize the server row so it is
      // not resurrected as an active session on the next start.
      if (get().session?.status === "finished") {
        void completeWorkoutSession(s.id);
      }
    },

    pause: () => {
      const s = get().session;
      if (!s || (s.status !== "executing" && s.status !== "resting")) return;
      const now = Date.now();
      void commitEvent(
        false,
        buildEvent(s.id, "WORKOUT_PAUSED", now, { pausedAt: now }, getWorkoutSessionDeviceId()),
      );
    },

    resume: () => {
      const s = get().session;
      if (!s || s.status !== "paused" || s.pausedAt == null) return;
      const now = Date.now();
      void commitEvent(
        false,
        buildEvent(s.id, "WORKOUT_RESUMED", now, { resumedAt: now }, getWorkoutSessionDeviceId()),
      );
    },

    finishEarly: () => {
      const s = get().session;
      if (!s || s.status === "finished" || s.status === "planning") return;
      const now = Date.now();
      void commitEventNow(
        true,
        buildEvent(s.id, "WORKOUT_FINISHED", now, { finishedAt: now }, getWorkoutSessionDeviceId()),
      );
      if (get().session?.status === "finished") {
        void completeWorkoutSession(s.id);
      }
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
      if (id) {
        void clearCachedSession(id);
        void completeWorkoutSession(id);
      }
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
      void completeWorkoutSession(s.id);
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
          getWorkoutSessionDeviceId(),
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
            getWorkoutSessionDeviceId(),
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
          getWorkoutSessionDeviceId(),
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
            getWorkoutSessionDeviceId(),
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
          getWorkoutSessionDeviceId(),
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
          getWorkoutSessionDeviceId(),
        ),
      );
    },

    addExerciseToSession: (exercise) => {
      const s = get().session;
      if (!s) return;
      void commitEvent(
        true,
        buildEvent(
          s.id,
          "EXERCISE_ADDED",
          Date.now(),
          {
            exerciseId: exercise.id,
            sets: Math.max(1, exercise.defaultSets),
            reps: exercise.defaultReps,
            weightKg: exercise.defaultWeightKg ?? 0,
            restSec: exercise.defaultRestSec,
          },
          getWorkoutSessionDeviceId(),
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
        if (run !== hydrationRun) return;

        const fallbackSession = get().session ?? localSnapshot?.session ?? null;
        if (fallbackSession) {
          set({
            session: fallbackSession,
            activeSession: fallbackSession,
            serverVersion: get().serverVersion ?? localVersion(localSnapshot),
            pendingSync: true,
            hydrationStatus: "ready",
          });
          persistLocalSession(fallbackSession, get().serverVersion, true);
          void syncSessionOutbox(fallbackSession.id);
          return;
        }

        set({ hydrationStatus: "error" });
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

    applyRemoteWorkoutSessionEvents: async (events) => {
      await applyRemoteWorkoutSessionEventsNow(events);
    },

    getRealtimeSyncState: () => ({
      sessionId: get().session?.id ?? null,
      serverVersion: get().serverVersion,
      hydrationReady: get().hydrationStatus === "ready",
      deviceId: getWorkoutSessionDeviceId(),
      ownClientEventIds: new Set(localClientEventIds),
    }),
  };
});
