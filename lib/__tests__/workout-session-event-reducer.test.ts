import { describe, expect, it } from "vitest";

import { buildActiveSession } from "@/lib/session-utils";
import {
  applyWorkoutSessionEvent,
  outboxEventToRecord,
  replayWorkoutSessionEvents,
} from "@/lib/workout-session-event-reducer";
import type {
  ActiveSession,
  Workout,
  WorkoutSessionEventRecord,
  WorkoutSessionJson,
  WorkoutSessionOutboxEvent,
} from "@/types";

const NOW = 1_800_000_000_000;

function makeWorkout(): Workout {
  return {
    id: "workout-1",
    name: "Push",
    type: "Push",
    estimatedDurationMin: 45,
    completed: false,
    exercises: [
      {
        id: "we-1",
        exerciseId: "bench-press",
        sets: 2,
      reps: "8-10",
      weightKg: 80,
        restSec: 0,
        order: 0,
      },
    ],
  };
}

function asJson(session: ActiveSession): WorkoutSessionJson {
  return JSON.parse(JSON.stringify(session)) as WorkoutSessionJson;
}

function remoteEvent(
  session: ActiveSession,
  sequenceNumber: number,
  eventType: WorkoutSessionEventRecord["eventType"],
  payload: WorkoutSessionJson,
  clientEventId = `client-${sequenceNumber}`,
): WorkoutSessionEventRecord {
  return {
    id: `event-${sequenceNumber}`,
    sessionId: session.id,
    userId: "user-1",
    eventType,
    payload,
    clientEventId,
    deviceId: "device-a",
    sequenceNumber,
    createdAt: NOW + sequenceNumber,
  };
}

function startEvent(session: ActiveSession): WorkoutSessionEventRecord {
  return remoteEvent(
    session,
    1,
    "WORKOUT_STARTED",
    {
      sessionId: session.id,
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      startedAt: session.startedAt,
      nextState: asJson(session),
    },
    "start-client",
  );
}

function pendingOutbox(
  session: ActiveSession,
  localSequenceNumber: number,
  eventType: WorkoutSessionEventRecord["eventType"],
  payload: WorkoutSessionJson,
  clientEventId = `pending-${localSequenceNumber}`,
): WorkoutSessionOutboxEvent {
  return {
    id: clientEventId,
    sessionId: session.id,
    userId: "user-1",
    eventType,
    payload,
    nextState: asJson(session),
    clientEventId,
    deviceId: "device-b",
    baseVersion: localSequenceNumber - 1,
    localSequenceNumber,
    createdAt: NOW + localSequenceNumber,
    syncStatus: "pending",
    retryCount: 0,
    lastError: null,
  };
}

describe("workout session event replay", () => {
  it("ignores the same event twice by client_event_id", () => {
    const session = buildActiveSession(makeWorkout());
    const started = startEvent(session);

    const result = replayWorkoutSessionEvents(null, [started, { ...started, id: "event-dupe" }]);

    expect(result.session?.id).toBe(session.id);
    expect(result.appliedClientEventIds).toEqual(["start-client"]);
    expect(result.duplicateClientEventIds).toEqual(["start-client"]);
  });

  it("uses remote server order before local pending order during a conflict", () => {
    const session = buildActiveSession(makeWorkout());
    const remote = [
      startEvent(session),
      remoteEvent(session, 2, "SET_STARTED", {
        exerciseId: session.exercises[0].id,
      setIndex: 0,
      startedAt: NOW + 2,
      }, "remote-start"),
      remoteEvent(session, 3, "WORKOUT_PAUSED", { pausedAt: NOW + 3 }, "remote-pause"),
    ];
    const remoteReplay = replayWorkoutSessionEvents(null, remote);
    const localResume = pendingOutbox(
      session,
      4,
      "WORKOUT_RESUMED",
      { resumedAt: NOW + 4, nextState: asJson(session) },
    );

    const merged = replayWorkoutSessionEvents(remoteReplay.session, [outboxEventToRecord(localResume, 4)]);

    expect(remoteReplay.session?.status).toBe("paused");
    expect(merged.session?.status).toBe("executing");
  });

  it("replays local pending events in local order", () => {
    const session = buildActiveSession(makeWorkout());
    const begin = pendingOutbox(session, 2, "SET_STARTED", {
      exerciseId: session.exercises[0].id,
      setIndex: 0,
      startedAt: NOW + 2,
      reps: 8,
      weightKg: 80,
    });
    const complete = pendingOutbox(session, 3, "SET_COMPLETED", {
      exerciseId: session.exercises[0].id,
      setIndex: 0,
      completedAt: NOW + 3,
      reps: 8,
      weightKg: 80,
    });

    const result = replayWorkoutSessionEvents(session, [
      outboxEventToRecord(complete, 3),
      outboxEventToRecord(begin, 2),
    ]);

    expect(result.session?.exercises[0].sets[0].status).toBe("completed");
    expect(result.session?.currentSetIndex).toBe(1);
  });

  it("deduplicates duplicated realtime plus hydration events", () => {
    const session = buildActiveSession(makeWorkout());
    const event = remoteEvent(session, 2, "SET_STARTED", {
      exerciseId: session.exercises[0].id,
      setIndex: 0,
      startedAt: NOW + 2,
    }, "same-realtime-hydration-id");

    const result = replayWorkoutSessionEvents(session, [event, { ...event, sequenceNumber: 3, id: "hydrated-copy" }]);

    expect(result.session?.exercises[0].sets[0].status).toBe("active");
    expect(result.duplicateClientEventIds).toEqual(["same-realtime-hydration-id"]);
  });

  it("validates replay consistency and merged state equality", () => {
    const session = buildActiveSession(makeWorkout());
    const events = [
      startEvent(session),
      remoteEvent(session, 2, "SET_STARTED", {
        exerciseId: session.exercises[0].id,
      setIndex: 0,
      startedAt: NOW + 2,
      }),
      remoteEvent(session, 3, "SET_UPDATED", {
        exerciseId: session.exercises[0].id,
      setIndex: 0,
      reps: 9,
      weightKg: 82.5,
      }),
    ];

    const first = replayWorkoutSessionEvents(null, events);
    const second = replayWorkoutSessionEvents(null, events);

    expect(first.session).toEqual(second.session);
    expect(first.skippedEventIds).toEqual([]);
  });

  it("keeps the reducer pure and deterministic", () => {
    const session = buildActiveSession(makeWorkout());
    const before = asJson(session);
    const event = {
      id: "set-started",
      type: "SET_STARTED" as const,
      occurredAt: NOW + 2,
      payload: {
        exerciseId: session.exercises[0].id,
      setIndex: 0,
      startedAt: NOW + 2,
      reps: 8,
      weightKg: 80,
      },
      clientEventId: "set-started",
      deviceId: "device-a",
    };

    const first = applyWorkoutSessionEvent(session, event);
    const second = applyWorkoutSessionEvent(session, event);

    expect(asJson(session)).toEqual(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(session);
  });

  it("does not corrupt state when a local update targets a remotely deleted set", () => {
    const session = buildActiveSession(makeWorkout());
    const remotelyDeleted = JSON.parse(JSON.stringify(session)) as ActiveSession;
    remotelyDeleted.exercises[0].sets.splice(1, 1);
    remotelyDeleted.updatedAt = NOW + 2;
    const localUpdate = pendingOutbox(session, 3, "SET_UPDATED", {
      exerciseId: session.exercises[0].id,
      setIndex: 1,
      reps: 12,
      weightKg: 90,
    });

    const result = replayWorkoutSessionEvents(remotelyDeleted, [outboxEventToRecord(localUpdate, 3)]);

    expect(result.session).toEqual(remotelyDeleted);
    expect(result.skippedEventIds).toEqual([localUpdate.id]);
  });

  it("replays 1000+ canonical events without relying on payload snapshots", () => {
    const workout = makeWorkout();
    workout.exercises[0].sets = 1001;
    const session = buildActiveSession(workout);
    const events: WorkoutSessionEventRecord[] = [startEvent(session)];

    events.push(remoteEvent(session, 2, "SET_STARTED", {
      exerciseId: session.exercises[0].id,
      setIndex: 0,
      startedAt: NOW + 2,
      reps: 8,
      weightKg: 80,
    }, "start-set-0"));

    for (let index = 0; index < 1000; index += 1) {
      events.push(remoteEvent(session, index + 3, "SET_COMPLETED", {
        exerciseId: session.exercises[0].id,
        setIndex: index,
        completedAt: NOW + index + 3,
        reps: 8,
        weightKg: 80,
      }, `complete-${index}`));
    }

    const startedAt = performance.now();
    const result = replayWorkoutSessionEvents(null, events);
    const durationMs = performance.now() - startedAt;

    expect(result.skippedEventIds).toEqual([]);
    expect(result.session?.exercises[0].sets[999].status).toBe("completed");
    expect(result.session?.currentSetIndex).toBe(1000);
    expect(durationMs).toBeLessThan(1_000);
  });

  it("appends a new exercise with pending sets without touching existing ones", () => {
    const session = buildActiveSession(makeWorkout());
    const event = {
      id: "exercise-added-1",
      type: "EXERCISE_ADDED" as const,
      occurredAt: NOW + 2,
      payload: {
        exerciseId: "incline-press",
        sets: 3,
        reps: "10-12",
        weightKg: 60,
        restSec: 75,
      },
      clientEventId: "exercise-added-1",
      deviceId: "device-a",
    };

    const result = applyWorkoutSessionEvent(session, event);

    expect(result?.exercises).toHaveLength(2);
    const added = result?.exercises[1];
    expect(added?.exerciseId).toBe("incline-press");
    expect(added?.order).toBe(1);
    expect(added?.sets).toHaveLength(3);
    expect(added?.sets.every((s) => s.status === "pending")).toBe(true);
    expect(added?.sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
    // existing exercise untouched, session still planning
    expect(result?.exercises[0].sets).toHaveLength(2);
    expect(result?.status).toBe("planning");
  });

  it("re-opens a finished session to executing when an exercise is added", () => {
    const session = buildActiveSession(makeWorkout());
    session.status = "finished";
    session.finishedAt = NOW + 1;
    const event = {
      id: "exercise-added-2",
      type: "EXERCISE_ADDED" as const,
      occurredAt: NOW + 2,
      payload: {
        exerciseId: "incline-press",
        sets: 2,
        reps: "8-12",
        weightKg: 50,
        restSec: 60,
      },
      clientEventId: "exercise-added-2",
      deviceId: "device-a",
    };

    const result = applyWorkoutSessionEvent(session, event);

    expect(result?.status).toBe("executing");
    expect(result?.finishedAt).toBeNull();
    expect(result?.currentExerciseIndex).toBe(1);
    expect(result?.currentSetIndex).toBe(0);
    expect(result?.exercises[1].sets[0].status).toBe("active");
  });

  it("keeps EXERCISE_ADDED replay deterministic (no random ids)", () => {
    const session = buildActiveSession(makeWorkout());
    const added = pendingOutbox(session, 2, "EXERCISE_ADDED", {
      exerciseId: "incline-press",
      sets: 2,
      reps: "10-12",
      weightKg: 40,
      restSec: 90,
    });
    const record = outboxEventToRecord(added, 2);

    const first = replayWorkoutSessionEvents(session, [record]);
    const second = replayWorkoutSessionEvents(session, [record]);

    expect(first.session).toEqual(second.session);
    expect(first.skippedEventIds).toEqual([]);
    expect(first.session?.exercises).toHaveLength(2);
  });

});