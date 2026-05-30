import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildActiveSession } from "@/lib/session-utils";
import { applyWorkoutSessionEvent } from "@/lib/workout-session-event-reducer";
import {
  appendWorkoutSessionEvent,
  getActiveWorkoutSession,
  getWorkoutSessionById,
  getWorkoutSessionEventsAfter,
  startWorkoutSession,
} from "@/lib/supabase-workout-session-events";
import {
  clearWorkoutSessionOutboxForTests,
  listWorkoutSessionOutboxEvents,
  putWorkoutSessionOutboxEvent,
} from "@/lib/idb-workout-session-outbox";
import { useActiveSessionStore } from "@/store";
import type { ActiveSession, Workout, WorkoutSessionEventRecord, WorkoutSessionJson } from "@/types";

vi.mock("@/lib/supabase-workout-session-events", () => ({
  getActiveWorkoutSession: vi.fn(),
  getWorkoutSessionById: vi.fn(),
  getWorkoutSessionEventsAfter: vi.fn(),
  startWorkoutSession: vi.fn(),
  appendWorkoutSessionEvent: vi.fn(),
  completeWorkoutSession: vi.fn(),
}));

const appendMock = vi.mocked(appendWorkoutSessionEvent);
const getActiveMock = vi.mocked(getActiveWorkoutSession);
const eventsAfterMock = vi.mocked(getWorkoutSessionEventsAfter);
const getByIdMock = vi.mocked(getWorkoutSessionById);
const startMock = vi.mocked(startWorkoutSession);

function makeWorkout(): Workout {
  return {
    id: `w-${crypto.randomUUID()}`,
    name: "Offline Push",
    type: "Push",
    estimatedDurationMin: 45,
    completed: false,
    exercises: [
      {
        id: `we-${crypto.randomUUID()}`,
        exerciseId: "bench-press",
        sets: 2,
        reps: "8-10",
        weightKg: 80,
        restSec: 30,
        order: 0,
      },
    ],
  };
}

function asJson(session: ActiveSession): WorkoutSessionJson {
  return JSON.parse(JSON.stringify(session)) as WorkoutSessionJson;
}

function setOnline(value: boolean): void {
  vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(value);
}

async function flushOutbox(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function resetStore(): Promise<void> {
  await clearWorkoutSessionOutboxForTests();
  vi.restoreAllMocks();
  setOnline(false);
  useActiveSessionStore.setState({
    session: null,
    activeSession: null,
    serverVersion: null,
    pendingSync: false,
    hydrationStatus: "idle",
    past: [],
    future: [],
  });
  getActiveMock.mockRejectedValue(new Error("offline"));
  getByIdMock.mockReset();
  getByIdMock.mockResolvedValue(null);
  eventsAfterMock.mockResolvedValue([]);
  startMock.mockImplementation(async (input) => ({
    id: input.sessionId,
    userId: "user-1",
    workoutId: input.workoutId,
    workoutName: input.workoutName,
    startedAt: Date.now(),
    totalActiveMs: 0,
    status: "active",
    currentState: input.initialState,
    version: 1,
  }));
  appendMock.mockImplementation(async (input) => ({
    id: crypto.randomUUID(),
    sessionId: input.sessionId,
    userId: "user-1",
    eventType: input.eventType,
    payload: input.payload,
    clientEventId: input.clientEventId,
    deviceId: input.deviceId ?? null,
    sequenceNumber: input.expectedVersion + 1,
    createdAt: Date.now(),
  }));
}

async function startOfflineWorkout(): Promise<ActiveSession> {
  const session = await useActiveSessionStore.getState().startWorkoutSession(makeWorkout());
  expect(session).not.toBeNull();
  return session!;
}

describe("active workout Offline Outbox", () => {
  beforeEach(async () => {
    await resetStore();
  });

  it("supports offline complete set", async () => {
    const session = await startOfflineWorkout();

    useActiveSessionStore.getState().beginFirstSet();
    useActiveSessionStore.getState().completeSet();
    await flushOutbox();

    const current = useActiveSessionStore.getState().session!;
    expect(current.status).toBe("resting");
    expect(current.exercises[0].sets[0].status).toBe("completed");
    expect(startMock).not.toHaveBeenCalled();
    expect(appendMock).not.toHaveBeenCalled();
    expect((await listWorkoutSessionOutboxEvents(session.id)).map((event) => event.eventType)).toEqual([
      "WORKOUT_STARTED",
      "SET_STARTED",
      "SET_COMPLETED",
    ]);
  });

  it("supports offline pause and resume", async () => {
    await startOfflineWorkout();
    useActiveSessionStore.getState().beginFirstSet();
    await flushOutbox();
    useActiveSessionStore.getState().pause();
    expect(useActiveSessionStore.getState().session?.status).toBe("paused");

    useActiveSessionStore.getState().resume();
    expect(useActiveSessionStore.getState().session?.status).toBe("executing");
  });

  it("syncs queued events sequentially after reconnect", async () => {
    const session = await startOfflineWorkout();
    useActiveSessionStore.getState().beginFirstSet();
    useActiveSessionStore.getState().completeSet();
    await flushOutbox();
    setOnline(true);
    getActiveMock.mockResolvedValue(null);

    await useActiveSessionStore.getState().syncOutbox(session.id);

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(appendMock.mock.calls.map(([input]) => input.expectedVersion)).toEqual([1, 2]);
    expect(useActiveSessionStore.getState().pendingSync).toBe(false);
  });

  it("retries failed sync without deleting the local event", async () => {
    vi.useFakeTimers();
    try {
      const session = await startOfflineWorkout();
      useActiveSessionStore.getState().beginFirstSet();
      await flushOutbox();
      setOnline(true);
      getActiveMock.mockResolvedValue({
        id: session.id,
        userId: "user-1",
        workoutId: session.workoutId,
        workoutName: session.workoutName,
        startedAt: Date.now(),
        totalActiveMs: 0,
        status: "active",
        currentState: asJson(session),
        version: 1,
      });
      startMock.mockClear();
      appendMock.mockClear();
      appendMock.mockRejectedValueOnce(new Error("network"));

      await useActiveSessionStore.getState().syncOutbox(session.id);

      const failed = (await listWorkoutSessionOutboxEvents(session.id)).find(
        (event) => event.eventType === "SET_STARTED",
      );
      expect(failed?.syncStatus).toBe("failed");
      expect(failed?.retryCount).toBe(1);

      await useActiveSessionStore.getState().syncOutbox(session.id);
      expect(appendMock).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("prevents duplicate parallel sync for one session", async () => {
    const session = await startOfflineWorkout();
    useActiveSessionStore.getState().beginFirstSet();
    await flushOutbox();
    setOnline(true);
    getActiveMock.mockResolvedValue(null);
    startMock.mockClear();
    appendMock.mockClear();

    await Promise.all([
      useActiveSessionStore.getState().syncOutbox(session.id),
      useActiveSessionStore.getState().syncOutbox(session.id),
    ]);

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(appendMock).toHaveBeenCalledTimes(1);
  });

  it("recovers a stale syncing event after a crash", async () => {
    const session = buildActiveSession(makeWorkout());
    await putWorkoutSessionOutboxEvent({
      id: `stale-${crypto.randomUUID()}`,
      sessionId: session.id,
      userId: "user-1",
      eventType: "SET_STARTED",
      payload: {
        exerciseId: session.exercises[0].id,
        setIndex: 0,
        startedAt: Date.now(),
      },
      nextState: asJson(session),
      clientEventId: `client-${crypto.randomUUID()}`,
      deviceId: null,
      baseVersion: 1,
      localSequenceNumber: 2,
      createdAt: Date.now() - 5 * 60 * 1000,
      syncStatus: "syncing",
      retryCount: 0,
      lastError: null,
    });
    setOnline(true);
    getActiveMock.mockResolvedValue({
      id: session.id,
      userId: "user-1",
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      startedAt: Date.now(),
      totalActiveMs: 0,
      status: "active",
      currentState: asJson(session),
      version: 1,
    });

    await useActiveSessionStore.getState().syncOutbox(session.id);

    expect(appendMock).toHaveBeenCalledWith(expect.objectContaining({ sessionId: session.id }));
  });

  it("does not treat an active recent syncing event as stale by createdAt", async () => {
    const session = buildActiveSession(makeWorkout());
    await putWorkoutSessionOutboxEvent({
      id: `recent-sync-${crypto.randomUUID()}`,
      sessionId: session.id,
      userId: "user-1",
      eventType: "SET_STARTED",
      payload: {
        exerciseId: session.exercises[0].id,
        setIndex: 0,
        startedAt: Date.now(),
      },
      nextState: asJson(session),
      clientEventId: `client-${crypto.randomUUID()}`,
      deviceId: null,
      baseVersion: 1,
      localSequenceNumber: 2,
      createdAt: Date.now() - 30 * 60 * 1000,
      syncStartedAt: Date.now(),
      syncStatus: "syncing",
      retryCount: 0,
      lastError: null,
    });
    setOnline(true);

    appendMock.mockClear();
    await useActiveSessionStore.getState().syncOutbox(session.id);

    expect(appendMock).not.toHaveBeenCalled();
    const [event] = await listWorkoutSessionOutboxEvents(session.id);
    expect(event.syncStatus).toBe("syncing");
  });

  it("clears a pending retry timeout before a manual sync", async () => {
    vi.useFakeTimers();
    try {
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
      const session = await startOfflineWorkout();
      useActiveSessionStore.getState().beginFirstSet();
      await flushOutbox();
      setOnline(true);
      getActiveMock.mockResolvedValue({
        id: session.id,
        userId: "user-1",
        workoutId: session.workoutId,
        workoutName: session.workoutName,
        startedAt: Date.now(),
        totalActiveMs: 0,
        status: "active",
        currentState: asJson(session),
        version: 1,
      });
      startMock.mockClear();
      appendMock.mockClear();
      appendMock.mockRejectedValueOnce(new Error("network"));

      await useActiveSessionStore.getState().syncOutbox(session.id);
      expect(vi.getTimerCount()).toBe(1);

      await useActiveSessionStore.getState().syncOutbox(session.id);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });


  it("rebuilds stale local outbox against newer remote events before append", async () => {
    vi.useFakeTimers();
    try {
      appendMock.mockClear();
      const session = buildActiveSession(makeWorkout());
      const started = applyWorkoutSessionEvent(session, {
        id: "local-start-set",
        type: "SET_STARTED",
        occurredAt: Date.now(),
        payload: {
          exerciseId: session.exercises[0].id,
          setIndex: 0,
          startedAt: Date.now(),
          reps: 8,
          weightKg: 80,
        },
        clientEventId: "local-start-set",
        deviceId: "device-a",
      });
      expect(started).not.toBeNull();

      useActiveSessionStore.setState({
        session,
        activeSession: session,
        serverVersion: 1,
        pendingSync: true,
        hydrationStatus: "ready",
        past: [],
        future: [],
      });
      await putWorkoutSessionOutboxEvent({
        id: "local-start-set",
        sessionId: session.id,
        userId: "user-1",
        eventType: "SET_STARTED",
        payload: {
          exerciseId: session.exercises[0].id,
          setIndex: 0,
          startedAt: Date.now(),
          reps: 8,
          weightKg: 80,
        },
        nextState: asJson(started!),
        clientEventId: "local-start-set",
        deviceId: "device-a",
        baseVersion: 1,
        localSequenceNumber: 2,
        createdAt: Date.now(),
        syncStatus: "pending",
        retryCount: 0,
        lastError: null,
      });

      setOnline(true);
      const remote = {
        id: session.id,
        userId: "user-1",
        workoutId: session.workoutId,
        workoutName: session.workoutName,
        startedAt: Date.now(),
        totalActiveMs: 0,
        status: "active" as const,
        currentState: asJson(session),
        version: 2,
      };
      getActiveMock.mockResolvedValue(remote);
      getByIdMock.mockResolvedValue(remote);
      const remoteEvents: WorkoutSessionEventRecord[] = [
        {
          id: "remote-start",
          sessionId: session.id,
          userId: "user-1",
          eventType: "WORKOUT_STARTED",
          payload: {
            sessionId: session.id,
            workoutId: session.workoutId,
            workoutName: session.workoutName,
            startedAt: session.startedAt,
            nextState: asJson(session),
          },
          clientEventId: "remote-start-client",
          deviceId: "device-b",
          sequenceNumber: 1,
          createdAt: Date.now(),
        },
        {
          id: "remote-rest-update",
          sessionId: session.id,
          userId: "user-1",
          eventType: "SET_UPDATED",
          payload: {
            exerciseId: session.exercises[0].id,
            setIndex: 0,
            restTargetSec: 120,
          },
          clientEventId: "remote-rest-update",
          deviceId: "device-b",
          sequenceNumber: 2,
          createdAt: Date.now(),
        },
      ];
      eventsAfterMock.mockImplementation(async (_sessionId, sequenceNumber) =>
        sequenceNumber === 0 ? remoteEvents : [],
      );

      await useActiveSessionStore.getState().syncOutbox(session.id);

      expect(appendMock).not.toHaveBeenCalled();
      let [event] = await listWorkoutSessionOutboxEvents(session.id);
      expect(event.baseVersion).toBe(2);
      expect(event.localSequenceNumber).toBe(3);
      expect(event.syncStatus).toBe("pending");
      expect(useActiveSessionStore.getState().session?.exercises[0].sets[0].restTargetSec).toBe(120);

      getActiveMock.mockResolvedValue({ ...remote, version: 2 });
      getByIdMock.mockResolvedValue({ ...remote, version: 2 });
      await useActiveSessionStore.getState().syncOutbox(session.id);

      expect(appendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedVersion: 2,
          eventType: "SET_STARTED",
        }),
      );
      [event] = await listWorkoutSessionOutboxEvents(session.id);
      expect(event.syncStatus).toBe("synced");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps obsolete local events as unresolved conflicts instead of deleting them", async () => {
    vi.useFakeTimers();
    try {
      appendMock.mockClear();
      const session = buildActiveSession(makeWorkout());
      useActiveSessionStore.setState({
        session,
        activeSession: session,
        serverVersion: 1,
        pendingSync: true,
        hydrationStatus: "ready",
        past: [],
        future: [],
      });
      await putWorkoutSessionOutboxEvent({
        id: "local-start-after-finish",
        sessionId: session.id,
        userId: "user-1",
        eventType: "SET_STARTED",
        payload: {
          exerciseId: session.exercises[0].id,
          setIndex: 0,
          startedAt: Date.now(),
        },
        nextState: asJson(session),
        clientEventId: "local-start-after-finish",
        deviceId: "device-a",
        baseVersion: 1,
        localSequenceNumber: 2,
        createdAt: Date.now(),
        syncStatus: "pending",
        retryCount: 0,
        lastError: null,
      });

      setOnline(true);
      const remote = {
        id: session.id,
        userId: "user-1",
        workoutId: session.workoutId,
        workoutName: session.workoutName,
        startedAt: Date.now(),
        totalActiveMs: 0,
        status: "completed" as const,
        currentState: asJson(session),
        version: 3,
      };
      getActiveMock.mockResolvedValue(remote);
      getByIdMock.mockResolvedValue(remote);
      const finished = { ...session, status: "finished" as const, finishedAt: Date.now() };
      const finishedEvents: WorkoutSessionEventRecord[] = [
        {
          id: "remote-start",
          sessionId: session.id,
          userId: "user-1",
          eventType: "WORKOUT_STARTED",
          payload: {
            sessionId: session.id,
            workoutId: session.workoutId,
            workoutName: session.workoutName,
            startedAt: session.startedAt,
            nextState: asJson(session),
          },
          clientEventId: "remote-start-client",
          deviceId: "device-b",
          sequenceNumber: 1,
          createdAt: Date.now(),
        },
        {
          id: "remote-set-started",
          sessionId: session.id,
          userId: "user-1",
          eventType: "SET_STARTED",
          payload: {
            exerciseId: session.exercises[0].id,
            setIndex: 0,
            startedAt: Date.now(),
          },
          clientEventId: "remote-set-started",
          deviceId: "device-b",
          sequenceNumber: 2,
          createdAt: Date.now(),
        },
        {
          id: "remote-finish",
          sessionId: session.id,
          userId: "user-1",
          eventType: "WORKOUT_FINISHED",
          payload: { finishedAt: finished.finishedAt },
          clientEventId: "remote-finish",
          deviceId: "device-b",
          sequenceNumber: 3,
          createdAt: Date.now(),
        },
      ];
      eventsAfterMock.mockResolvedValue(finishedEvents);

      await useActiveSessionStore.getState().syncOutbox(session.id);

      expect(appendMock).not.toHaveBeenCalled();
      const [event] = await listWorkoutSessionOutboxEvents(session.id);
      expect(event.syncStatus).toBe("conflict");
      expect(event.lastError).toContain("Unresolved conflict");
      expect(useActiveSessionStore.getState().pendingSync).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("restores pending outbox after refresh", async () => {
    const session = await startOfflineWorkout();
    useActiveSessionStore.setState({
      session: null,
      activeSession: null,
      serverVersion: null,
      pendingSync: false,
      hydrationStatus: "idle",
      past: [],
      future: [],
    });

    expect(await listWorkoutSessionOutboxEvents(session.id)).not.toHaveLength(0);
  });

  it("supports finish workout offline", async () => {
    const session = await startOfflineWorkout();
    useActiveSessionStore.getState().beginFirstSet();
    useActiveSessionStore.getState().finishEarly();
    await flushOutbox();

    expect(useActiveSessionStore.getState().session?.status).toBe("finished");
    expect((await listWorkoutSessionOutboxEvents(session.id)).map((event) => event.eventType)).toContain(
      "WORKOUT_FINISHED",
    );
  });
});
