import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildActiveSession } from "@/lib/session-utils";
import {
  getActiveWorkoutSession,
  getWorkoutSessionEventsAfter,
} from "@/lib/supabase-workout-session-events";
import { useActiveSessionStore } from "@/store";
import type { ActiveSession, Workout, WorkoutSessionJson } from "@/types";

vi.mock("@/lib/supabase-workout-session-events", () => ({
  getActiveWorkoutSession: vi.fn(),
  getWorkoutSessionEventsAfter: vi.fn(),
}));

const getActiveWorkoutSessionMock = vi.mocked(getActiveWorkoutSession);
const getWorkoutSessionEventsAfterMock = vi.mocked(getWorkoutSessionEventsAfter);

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
    hydrationStatus: "idle",
    past: [],
    future: [],
  });
  getActiveWorkoutSessionMock.mockReset();
  getWorkoutSessionEventsAfterMock.mockReset();
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

  it("does not issue duplicate hydration while a local active session exists", async () => {
    const session = buildActiveSession(makeWorkout());
    useActiveSessionStore.setState({
      session,
      activeSession: session,
      serverVersion: 7,
      hydrationStatus: "ready",
      past: [],
      future: [],
    });

    await useActiveSessionStore.getState().hydrateActiveWorkoutSession();

    expect(getActiveWorkoutSessionMock).not.toHaveBeenCalled();
    expect(useActiveSessionStore.getState().serverVersion).toBe(7);
  });

  it("resets server hydration metadata when starting a local session", () => {
    useActiveSessionStore.setState({ serverVersion: 9, hydrationStatus: "error" });

    useActiveSessionStore.getState().start(makeWorkout());

    expect(useActiveSessionStore.getState().serverVersion).toBeNull();
    expect(useActiveSessionStore.getState().hydrationStatus).toBe("ready");
    expect(useActiveSessionStore.getState().activeSession?.workoutId).toBe("w-1");
  });

  it("resets server hydration metadata when hydrating from local recovery", () => {
    const session = buildActiveSession(makeWorkout());
    useActiveSessionStore.setState({ serverVersion: 9, hydrationStatus: "error" });

    useActiveSessionStore.getState().hydrate(session);

    expect(useActiveSessionStore.getState().serverVersion).toBeNull();
    expect(useActiveSessionStore.getState().hydrationStatus).toBe("ready");
    expect(useActiveSessionStore.getState().activeSession?.id).toBe(session.id);
  });

});
