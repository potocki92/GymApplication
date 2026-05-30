import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildActiveSession, currentSet } from "@/lib/session-utils";
import {
  appendWorkoutSessionEvent,
  getActiveWorkoutSession,
  getWorkoutSessionEventsAfter,
  startWorkoutSession,
} from "@/lib/supabase-workout-session-events";
import {
  clearSession,
  loadSessionSnapshot,
  saveSessionSnapshot,
} from "@/lib/idb-session";
import { useActiveSessionStore } from "@/store";
import type { ActiveSession, Workout, WorkoutSessionJson } from "@/types";

vi.mock("@/lib/supabase-workout-session-events", () => ({
  getActiveWorkoutSession: vi.fn(),
  getWorkoutSessionEventsAfter: vi.fn(),
  startWorkoutSession: vi.fn(),
  appendWorkoutSessionEvent: vi.fn(),
}));

vi.mock("@/lib/idb-session", () => ({
  loadSessionSnapshot: vi.fn(),
  saveSessionSnapshot: vi.fn(),
  clearSession: vi.fn(),
}));

const appendWorkoutSessionEventMock = vi.mocked(appendWorkoutSessionEvent);
const getActiveWorkoutSessionMock = vi.mocked(getActiveWorkoutSession);
const getWorkoutSessionEventsAfterMock = vi.mocked(getWorkoutSessionEventsAfter);
const startWorkoutSessionMock = vi.mocked(startWorkoutSession);
const clearSessionMock = vi.mocked(clearSession);
const loadSessionSnapshotMock = vi.mocked(loadSessionSnapshot);
const saveSessionSnapshotMock = vi.mocked(saveSessionSnapshot);

function makeWorkout(): Workout {
  return {
    id: "w-1",
    name: "Push",
    type: "Push",
    estimatedDurationMin: 45,
    completed: false,
    exercises: [
      {
        id: "we-1",
        exerciseId: "bench-press",
        sets: 1,
        reps: "8-10",
        weightKg: 80,
        restSec: 90,
        order: 0,
      },
    ],
  };
}

function asJson(session: ActiveSession): WorkoutSessionJson {
  return JSON.parse(JSON.stringify(session)) as WorkoutSessionJson;
}

function resetStore(): void {
  useActiveSessionStore.setState({
    session: null,
    activeSession: null,
    serverVersion: null,
    pendingSync: false,
    hydrationStatus: "idle",
    past: [],
    future: [],
  });
  getActiveWorkoutSessionMock.mockReset();
  getWorkoutSessionEventsAfterMock.mockReset();
  startWorkoutSessionMock.mockReset();
  appendWorkoutSessionEventMock.mockReset();
  clearSessionMock.mockReset();
  loadSessionSnapshotMock.mockReset();
  loadSessionSnapshotMock.mockResolvedValue(null);
  saveSessionSnapshotMock.mockReset();
}

describe("hydrateActiveWorkoutSession", () => {
  beforeEach(() => resetStore());

  it("marks the store ready with no active session when Supabase has none", async () => {
    getActiveWorkoutSessionMock.mockResolvedValue(null);

    await useActiveSessionStore.getState().hydrateActiveWorkoutSession();

    expect(useActiveSessionStore.getState().activeSession).toBeNull();
    expect(useActiveSessionStore.getState().serverVersion).toBeNull();
    expect(useActiveSessionStore.getState().hydrationStatus).toBe("ready");
    expect(getWorkoutSessionEventsAfterMock).not.toHaveBeenCalled();
  });


  it("restores a local active session immediately before remote hydration", async () => {
    const local = {
      ...buildActiveSession(makeWorkout()),
      status: "paused" as const,
      pausedAt: Date.now(),
    };
    let resolveRemote: (value: null) => void = () => undefined;
    getActiveWorkoutSessionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRemote = resolve;
      }),
    );
    loadSessionSnapshotMock.mockResolvedValue({
      cacheVersion: 2,
      session: local,
      serverVersion: 4,
      dirty: false,
      savedAt: Date.now(),
    });

    const hydration = useActiveSessionStore.getState().hydrateActiveWorkoutSession();
    await Promise.resolve();
    await Promise.resolve();

    expect(useActiveSessionStore.getState().activeSession?.id).toBe(local.id);
    expect(useActiveSessionStore.getState().activeSession?.status).toBe("paused");
    expect(useActiveSessionStore.getState().serverVersion).toBe(4);
    expect(useActiveSessionStore.getState().hydrationStatus).toBe("loading");

    resolveRemote(null);
    await hydration;
    expect(useActiveSessionStore.getState().activeSession).toBeNull();
    expect(clearSessionMock).toHaveBeenCalledWith(local.id);
  });

  it("overwrites the local snapshot when remote has a newer version", async () => {
    const local = buildActiveSession(makeWorkout());
    const remote: ActiveSession = {
      ...local,
      status: "paused",
      pausedAt: Date.now(),
      updatedAt: local.updatedAt + 1000,
    };
    loadSessionSnapshotMock.mockResolvedValue({
      cacheVersion: 2,
      session: local,
      serverVersion: 2,
      dirty: false,
      savedAt: Date.now(),
    });
    getActiveWorkoutSessionMock.mockResolvedValue({
      id: remote.id,
      userId: "user-1",
      workoutId: remote.workoutId,
      workoutName: remote.workoutName,
      startedAt: Date.now(),
      totalActiveMs: 0,
      status: "paused",
      currentState: asJson(remote),
      version: 3,
    });
    getWorkoutSessionEventsAfterMock.mockResolvedValue([]);

    await useActiveSessionStore.getState().hydrateActiveWorkoutSession();

    expect(useActiveSessionStore.getState().activeSession?.status).toBe("paused");
    expect(useActiveSessionStore.getState().serverVersion).toBe(3);
    expect(useActiveSessionStore.getState().pendingSync).toBe(false);
    expect(saveSessionSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: remote.id, status: "paused" }),
      { serverVersion: 3, dirty: false },
    );
  });

  it("keeps local dirty state when local version is newer than remote", async () => {
    const local = {
      ...buildActiveSession(makeWorkout()),
      status: "paused" as const,
      pausedAt: Date.now(),
    };
    const remote = { ...local, status: "executing" as const, pausedAt: null };
    loadSessionSnapshotMock.mockResolvedValue({
      cacheVersion: 2,
      session: local,
      serverVersion: 5,
      dirty: true,
      savedAt: Date.now(),
    });
    getActiveWorkoutSessionMock.mockResolvedValue({
      id: remote.id,
      userId: "user-1",
      workoutId: remote.workoutId,
      workoutName: remote.workoutName,
      startedAt: Date.now(),
      totalActiveMs: 0,
      status: "active",
      currentState: asJson(remote),
      version: 4,
    });
    getWorkoutSessionEventsAfterMock.mockResolvedValue([]);

    await useActiveSessionStore.getState().hydrateActiveWorkoutSession();

    expect(useActiveSessionStore.getState().activeSession?.status).toBe("paused");
    expect(useActiveSessionStore.getState().serverVersion).toBe(5);
    expect(useActiveSessionStore.getState().pendingSync).toBe(true);
  });

  it("preserves a dirty local session when remote has no active session", async () => {
    const local = buildActiveSession(makeWorkout());
    loadSessionSnapshotMock.mockResolvedValue({
      cacheVersion: 2,
      session: local,
      serverVersion: 6,
      dirty: true,
      savedAt: Date.now(),
    });
    getActiveWorkoutSessionMock.mockResolvedValue(null);

    await useActiveSessionStore.getState().hydrateActiveWorkoutSession();

    expect(useActiveSessionStore.getState().activeSession?.id).toBe(local.id);
    expect(useActiveSessionStore.getState().pendingSync).toBe(true);
    expect(clearSessionMock).not.toHaveBeenCalled();
  });

  it("ignores stale hydration responses from an earlier call", async () => {
    const first = buildActiveSession(makeWorkout());
    const second: ActiveSession = {
      ...first,
      id: "session-newer",
      status: "paused",
      pausedAt: Date.now(),
      updatedAt: first.updatedAt + 1,
    };
    let resolveFirst: (value: Awaited<ReturnType<typeof getActiveWorkoutSession>>) => void =
      () => undefined;

    loadSessionSnapshotMock.mockResolvedValue(null);
    getActiveWorkoutSessionMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce({
        id: second.id,
        userId: "user-1",
        workoutId: second.workoutId,
        workoutName: second.workoutName,
        startedAt: Date.now(),
        totalActiveMs: 0,
        status: "paused",
        currentState: asJson(second),
        version: 8,
      });
    getWorkoutSessionEventsAfterMock.mockResolvedValue([]);

    const firstHydration = useActiveSessionStore.getState().hydrateActiveWorkoutSession();
    await Promise.resolve();
    await Promise.resolve();
    const secondHydration = useActiveSessionStore.getState().hydrateActiveWorkoutSession();
    await secondHydration;

    resolveFirst({
      id: first.id,
      userId: "user-1",
      workoutId: first.workoutId,
      workoutName: first.workoutName,
      startedAt: Date.now(),
      totalActiveMs: 0,
      status: "active",
      currentState: asJson(first),
      version: 7,
    });
    await firstHydration;

    expect(useActiveSessionStore.getState().activeSession?.id).toBe(second.id);
    expect(useActiveSessionStore.getState().serverVersion).toBe(8);
  });

  it("handles multiple hydration calls with the latest call winning", async () => {
    const session = buildActiveSession(makeWorkout());
    loadSessionSnapshotMock.mockResolvedValue(null);
    getActiveWorkoutSessionMock.mockResolvedValue({
      id: session.id,
      userId: "user-1",
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      startedAt: Date.now(),
      totalActiveMs: 0,
      status: "active",
      currentState: asJson(session),
      version: 10,
    });
    getWorkoutSessionEventsAfterMock.mockResolvedValue([]);

    await Promise.all([
      useActiveSessionStore.getState().hydrateActiveWorkoutSession(),
      useActiveSessionStore.getState().hydrateActiveWorkoutSession(),
    ]);

    expect(useActiveSessionStore.getState().activeSession?.id).toBe(session.id);
    expect(useActiveSessionStore.getState().serverVersion).toBe(10);
    expect(useActiveSessionStore.getState().hydrationStatus).toBe("ready");
  });

  it("hydrates current_state and server version from Supabase", async () => {
    const session = buildActiveSession(makeWorkout());
    getActiveWorkoutSessionMock.mockResolvedValue({
      id: session.id,
      userId: "user-1",
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      startedAt: Date.now(),
      totalActiveMs: 0,
      status: "active",
      currentState: asJson(session),
      version: 3,
    });
    getWorkoutSessionEventsAfterMock.mockResolvedValue([]);

    await useActiveSessionStore.getState().hydrateActiveWorkoutSession();

    expect(getWorkoutSessionEventsAfterMock).toHaveBeenCalledWith(session.id, 3);
    expect(useActiveSessionStore.getState().activeSession?.id).toBe(session.id);
    expect(useActiveSessionStore.getState().session?.id).toBe(session.id);
    expect(useActiveSessionStore.getState().serverVersion).toBe(3);
    expect(useActiveSessionStore.getState().hydrationStatus).toBe("ready");
  });

  it("replays snapshot events after the server version", async () => {
    const session = buildActiveSession(makeWorkout());
    const replayed = { ...session, status: "paused" as const, updatedAt: session.updatedAt + 1 };
    getActiveWorkoutSessionMock.mockResolvedValue({
      id: session.id,
      userId: "user-1",
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      startedAt: Date.now(),
      totalActiveMs: 0,
      status: "active",
      currentState: asJson(session),
      version: 3,
    });
    getWorkoutSessionEventsAfterMock.mockResolvedValue([
      {
        id: "event-4",
        sessionId: session.id,
        userId: "user-1",
        eventType: "SESSION_PAUSED",
        payload: { nextState: asJson(replayed) },
        clientEventId: "client-event-4",
        deviceId: null,
        sequenceNumber: 4,
        createdAt: Date.now(),
      },
    ]);

    await useActiveSessionStore.getState().hydrateActiveWorkoutSession();

    expect(useActiveSessionStore.getState().activeSession?.status).toBe("paused");
    expect(useActiveSessionStore.getState().serverVersion).toBe(4);
  });
  it("starts a new Supabase-backed workout session and stores server version", async () => {
    const workout = makeWorkout();
    getActiveWorkoutSessionMock.mockResolvedValue(null);
    getWorkoutSessionEventsAfterMock.mockResolvedValue([]);
    startWorkoutSessionMock.mockImplementation(async (input) => ({
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

    const session = await useActiveSessionStore.getState().startWorkoutSession(workout);

    expect(startWorkoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: expect.stringMatching(/^session-/),
        workoutId: workout.id,
        workoutName: workout.name,
        deviceId: null,
        clientEventId: expect.stringContaining("-start-"),
      }),
    );
    expect(session?.workoutId).toBe(workout.id);
    expect(useActiveSessionStore.getState().activeSession?.id).toBe(session?.id);
    expect(useActiveSessionStore.getState().serverVersion).toBe(1);
  });

  it("reuses an existing Supabase active session instead of creating another one", async () => {
    const existing = buildActiveSession(makeWorkout());
    getActiveWorkoutSessionMock.mockResolvedValue({
      id: existing.id,
      userId: "user-1",
      workoutId: existing.workoutId,
      workoutName: existing.workoutName,
      startedAt: Date.now(),
      totalActiveMs: 0,
      status: "active",
      currentState: asJson(existing),
      version: 5,
    });
    getWorkoutSessionEventsAfterMock.mockResolvedValue([]);

    const session = await useActiveSessionStore.getState().startWorkoutSession(makeWorkout());

    expect(startWorkoutSessionMock).not.toHaveBeenCalled();
    expect(session?.id).toBe(existing.id);
    expect(useActiveSessionStore.getState().serverVersion).toBe(5);
  });


  it("appends active workout actions with expected version and next state", async () => {
    const session = buildActiveSession(makeWorkout());
    useActiveSessionStore.setState({
      session,
      activeSession: session,
      serverVersion: 1,
      pendingSync: false,
      hydrationStatus: "ready",
      past: [],
      future: [],
    });
    appendWorkoutSessionEventMock.mockResolvedValue({
      id: "event-2",
      sessionId: session.id,
      userId: "user-1",
      eventType: "SET_STARTED",
      payload: {},
      clientEventId: "client-event-2",
      deviceId: null,
      sequenceNumber: 2,
      createdAt: Date.now(),
    });

    useActiveSessionStore.getState().beginFirstSet();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const nextState = appendWorkoutSessionEventMock.mock.calls[0]?.[0].nextState;
    expect(appendWorkoutSessionEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: session.id,
        eventType: "SET_STARTED",
        expectedVersion: 1,
        nextStatus: "active",
        deviceId: null,
        clientEventId: expect.stringContaining("set_started"),
        nextState: expect.any(Object),
      }),
    );
    expect(nextState).toMatchObject({
      id: session.id,
      status: "executing",
      currentExerciseIndex: 0,
      currentSetIndex: 0,
    });
    expect(useActiveSessionStore.getState().serverVersion).toBe(2);
    expect(currentSet(useActiveSessionStore.getState().activeSession!)?.status).toBe(
      "active",
    );
  });

  it("hydrates the server session after an append version conflict", async () => {
    const session = buildActiveSession(makeWorkout());
    const serverSession: ActiveSession = {
      ...session,
      status: "paused",
      pausedAt: Date.now(),
      updatedAt: session.updatedAt + 1,
    };
    useActiveSessionStore.setState({
      session,
      activeSession: session,
      serverVersion: 1,
      pendingSync: false,
      hydrationStatus: "ready",
      past: [],
      future: [],
    });
    appendWorkoutSessionEventMock.mockRejectedValue(
      new Error("Workout session version conflict: expected 1, got 2"),
    );
    getActiveWorkoutSessionMock.mockResolvedValue({
      id: serverSession.id,
      userId: "user-1",
      workoutId: serverSession.workoutId,
      workoutName: serverSession.workoutName,
      startedAt: Date.now(),
      totalActiveMs: 0,
      status: "paused",
      currentState: asJson(serverSession),
      version: 2,
    });
    getWorkoutSessionEventsAfterMock.mockResolvedValue([]);

    useActiveSessionStore.getState().beginFirstSet();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getActiveWorkoutSessionMock).toHaveBeenCalled();
    expect(useActiveSessionStore.getState().activeSession?.status).toBe("paused");
    expect(useActiveSessionStore.getState().serverVersion).toBe(2);
  });

});
