import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildActiveSession } from "@/lib/session-utils";
import {
  getActiveWorkoutSession,
  getWorkoutSessionEventsAfter,
  startWorkoutSession,
} from "@/lib/supabase-workout-session-events";
import { useActiveSessionStore } from "@/store";
import type { ActiveSession, Workout, WorkoutSessionJson } from "@/types";

vi.mock("@/lib/supabase-workout-session-events", () => ({
  getActiveWorkoutSession: vi.fn(),
  getWorkoutSessionEventsAfter: vi.fn(),
  startWorkoutSession: vi.fn(),
}));

const getActiveWorkoutSessionMock = vi.mocked(getActiveWorkoutSession);
const getWorkoutSessionEventsAfterMock = vi.mocked(getWorkoutSessionEventsAfter);
const startWorkoutSessionMock = vi.mocked(startWorkoutSession);

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
  startWorkoutSessionMock.mockReset();
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

});
