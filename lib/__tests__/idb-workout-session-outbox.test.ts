import { beforeEach, describe, expect, it } from "vitest";

import {
  cleanupWorkoutSessionOutbox,
  clearWorkoutSessionOutboxForTests,
  listWorkoutSessionOutboxEvents,
  putWorkoutSessionOutboxEvent,
} from "@/lib/idb-workout-session-outbox";
import type { WorkoutSessionJson, WorkoutSessionOutboxEvent } from "@/types";

const NOW = 1_800_000_000_000;
const NEXT_STATE: WorkoutSessionJson = {
  id: "session-1",
  workoutId: "workout-1",
  workoutName: "Push",
  status: "executing",
  startedAt: NOW,
  finishedAt: null,
  pausedAt: null,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  restStartedAt: null,
  restTargetSec: 0,
  exercises: [],
  version: 2,
  updatedAt: NOW,
};

function event(overrides: Partial<WorkoutSessionOutboxEvent> = {}): WorkoutSessionOutboxEvent {
  return {
    id: "event-1",
    sessionId: "session-1",
    userId: "user-1",
    eventType: "SET_STARTED",
    payload: {
      exerciseId: "exercise-1",
      setIndex: 0,
      nextState: NEXT_STATE,
    },
    nextState: NEXT_STATE,
    clientEventId: "client-1",
    deviceId: "device-1",
    baseVersion: 1,
    localSequenceNumber: 2,
    createdAt: NOW,
    syncStatus: "synced",
    retryCount: 0,
    lastError: null,
    ...overrides,
  };
}

describe("workout session outbox cache", () => {
  beforeEach(async () => {
    await clearWorkoutSessionOutboxForTests();
  });

  it("keeps nextState as local metadata instead of duplicating it in event payload", async () => {
    await putWorkoutSessionOutboxEvent(event());

    const [stored] = await listWorkoutSessionOutboxEvents("session-1");

    expect(stored.nextState).toEqual(NEXT_STATE);
    expect(stored.payload).toEqual({ exerciseId: "exercise-1", setIndex: 0 });
  });

  it("ignores cached records with unknown event types", async () => {
    await putWorkoutSessionOutboxEvent(event({
      id: "invalid-event-type",
      eventType: "UNKNOWN_EVENT" as WorkoutSessionOutboxEvent["eventType"],
    }));

    expect(await listWorkoutSessionOutboxEvents("session-1")).toEqual([]);
  });

  it("deduplicates retries by clientEventId", async () => {
    await putWorkoutSessionOutboxEvent(event({ id: "event-original", clientEventId: "same-client" }));
    await putWorkoutSessionOutboxEvent(
      event({
        id: "event-retry",
        clientEventId: "same-client",
        retryCount: 2,
        syncStatus: "failed",
      }),
    );

    const stored = await listWorkoutSessionOutboxEvents("session-1");

    expect(stored).toHaveLength(1);
    expect(stored[0].clientEventId).toBe("same-client");
    expect(stored[0].retryCount).toBe(2);
  });

  it("ignores corrupted records with unknown sync status", async () => {
    await putWorkoutSessionOutboxEvent(
      event({
        id: "corrupted-status",
        syncStatus: "stuck" as WorkoutSessionOutboxEvent["syncStatus"],
      }),
    );

    expect(await listWorkoutSessionOutboxEvents("session-1")).toEqual([]);
  });

  it("cleans synced orphan events but keeps active-session synced events", async () => {
    await putWorkoutSessionOutboxEvent(
      event({
        id: "active",
        clientEventId: "active-client",
        sessionId: "session-1",
        createdAt: NOW - 1_000,
      }),
    );
    await putWorkoutSessionOutboxEvent(
      event({
        id: "orphan",
        clientEventId: "orphan-client",
        sessionId: "session-2",
        createdAt: NOW - 1_000,
      }),
    );

    const removed = await cleanupWorkoutSessionOutbox({
      activeSessionIds: ["session-1"],
      now: NOW,
    });

    expect(removed).toBe(1);
    expect((await listWorkoutSessionOutboxEvents()).map((item) => item.id)).toEqual(["active"]);
  });
});
