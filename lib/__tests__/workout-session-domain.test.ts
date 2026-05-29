import { describe, expect, it } from "vitest";

import {
  applyWorkoutSessionEvent,
  getCompletedSets,
  getElapsedWorkoutMs,
  getExercisesCount,
  getRestRemainingSec,
  getTotalReps,
  getTotalVolumeKg,
  replayWorkoutSessionEvents,
  type WorkoutSessionEvent,
} from "@/features/workout-session/domain";

const started = {
  id: "evt-1",
  type: "WORKOUT_STARTED",
  occurredAt: 1_000,
  payload: {
    sessionId: "session-1",
    workoutId: "workout-1",
    workoutName: "Push",
  },
} satisfies WorkoutSessionEvent;

function event<T extends WorkoutSessionEvent>(value: T): T {
  return value;
}

describe("workout session event reducer", () => {
  it("builds an active session from WORKOUT_STARTED", () => {
    const state = applyWorkoutSessionEvent(null, started);

    expect(state).toMatchObject({
      sessionId: "session-1",
      workoutId: "workout-1",
      workoutName: "Push",
      status: "active",
      startedAt: 1_000,
      totalPausedMs: 0,
      currentExerciseId: null,
    });
    expect(state.sets).toEqual([]);
    expect(state.notes).toEqual([]);
  });

  it("replays exercise, set, rest, note, pause/resume and finish events", () => {
    const state = replayWorkoutSessionEvents(null, [
      started,
      event({
        id: "evt-2",
        type: "EXERCISE_STARTED",
        occurredAt: 2_000,
        payload: { exerciseId: "bench-press", exerciseIndex: 0 },
      }),
      event({
        id: "evt-3",
        type: "SET_STARTED",
        occurredAt: 3_000,
        payload: { exerciseId: "bench-press", setIndex: 0, reps: 8, weightKg: 70 },
      }),
      event({
        id: "evt-4",
        type: "SET_COMPLETED",
        occurredAt: 10_000,
        payload: {
          exerciseId: "bench-press",
          setIndex: 0,
          reps: 9,
          weightKg: 72.5,
          rpe: 8,
          notes: "Mocna seria",
        },
      }),
      event({
        id: "evt-5",
        type: "REST_STARTED",
        occurredAt: 10_000,
        payload: { durationSec: 90, exerciseId: "bench-press", setIndex: 0 },
      }),
      event({
        id: "evt-6",
        type: "WORKOUT_PAUSED",
        occurredAt: 20_000,
        payload: {},
      }),
      event({
        id: "evt-7",
        type: "WORKOUT_RESUMED",
        occurredAt: 50_000,
        payload: {},
      }),
      event({
        id: "evt-8",
        type: "REST_SKIPPED",
        occurredAt: 55_000,
        payload: {},
      }),
      event({
        id: "evt-9",
        type: "NOTE_ADDED",
        occurredAt: 56_000,
        payload: { note: "Dobra energia" },
      }),
      event({
        id: "evt-10",
        type: "WORKOUT_FINISHED",
        occurredAt: 120_000,
        payload: {},
      }),
    ]);

    expect(state).not.toBeNull();
    expect(state?.status).toBe("completed");
    expect(state?.finishedAt).toBe(120_000);
    expect(state?.totalPausedMs).toBe(30_000);
    expect(state?.currentExerciseId).toBe("bench-press");
    expect(state?.restTimer.status).toBe("idle");
    expect(state?.notes).toEqual([
      { id: "evt-9", note: "Dobra energia", createdAt: 56_000 },
    ]);
    expect(state?.sets).toHaveLength(1);
    expect(state?.sets[0]).toMatchObject({
      exerciseId: "bench-press",
      setIndex: 0,
      reps: 9,
      weightKg: 72.5,
      rpe: 8,
      notes: "Mocna seria",
      status: "completed",
    });
  });

  it("updates and deletes sets without mutating previous state", () => {
    const withSet = replayWorkoutSessionEvents(null, [
      started,
      event({
        id: "evt-2",
        type: "SET_STARTED",
        occurredAt: 2_000,
        payload: { exerciseId: "squat", setIndex: 0, reps: 5, weightKg: 100 },
      }),
    ]);

    if (!withSet) throw new Error("Expected session state");

    const updated = applyWorkoutSessionEvent(
      withSet,
      event({
        id: "evt-3",
        type: "SET_UPDATED",
        occurredAt: 3_000,
        payload: { exerciseId: "squat", setIndex: 0, reps: 6, rpe: 9 },
      }),
    );
    const deleted = applyWorkoutSessionEvent(
      updated,
      event({
        id: "evt-4",
        type: "SET_DELETED",
        occurredAt: 4_000,
        payload: { exerciseId: "squat", setIndex: 0 },
      }),
    );

    expect(withSet.sets[0]).toMatchObject({ reps: 5, rpe: null, status: "started" });
    expect(updated.sets[0]).toMatchObject({ reps: 6, rpe: 9, status: "started" });
    expect(deleted.sets[0].status).toBe("deleted");
  });

  it("throws when a non-start event is applied before a session exists", () => {
    expect(() =>
      applyWorkoutSessionEvent(
        null,
        event({
          id: "evt-2",
          type: "SET_STARTED",
          occurredAt: 2_000,
          payload: { exerciseId: "deadlift", setIndex: 0 },
        }),
      ),
    ).toThrow("cannot be applied before WORKOUT_STARTED");
  });
});

describe("workout session selectors", () => {
  it("derives elapsed time, rest, completed sets, volume, reps and exercise count", () => {
    const state = replayWorkoutSessionEvents(null, [
      started,
      event({
        id: "evt-2",
        type: "SET_COMPLETED",
        occurredAt: 10_000,
        payload: { exerciseId: "bench-press", setIndex: 0, reps: 8, weightKg: 70 },
      }),
      event({
        id: "evt-3",
        type: "SET_COMPLETED",
        occurredAt: 20_000,
        payload: { exerciseId: "row", setIndex: 0, reps: 10, weightKg: 50 },
      }),
      event({
        id: "evt-4",
        type: "SET_COMPLETED",
        occurredAt: 30_000,
        payload: { exerciseId: "row", setIndex: 1, reps: 0, weightKg: 50 },
      }),
      event({
        id: "evt-5",
        type: "REST_STARTED",
        occurredAt: 40_000,
        payload: { durationSec: 90 },
      }),
      event({
        id: "evt-6",
        type: "WORKOUT_PAUSED",
        occurredAt: 50_000,
        payload: {},
      }),
    ]);

    if (!state) throw new Error("Expected session state");

    expect(getElapsedWorkoutMs(state, 80_000)).toBe(49_000);
    expect(getRestRemainingSec(state, 65_000)).toBe(65);
    expect(getCompletedSets(state)).toHaveLength(3);
    expect(getTotalVolumeKg(state)).toBe(1_060);
    expect(getTotalReps(state)).toBe(18);
    expect(getExercisesCount(state)).toBe(2);
  });

  it("ignores deleted sets in aggregate selectors", () => {
    const state = replayWorkoutSessionEvents(null, [
      started,
      event({
        id: "evt-2",
        type: "SET_COMPLETED",
        occurredAt: 10_000,
        payload: { exerciseId: "bench-press", setIndex: 0, reps: 8, weightKg: 70 },
      }),
      event({
        id: "evt-3",
        type: "SET_DELETED",
        occurredAt: 11_000,
        payload: { exerciseId: "bench-press", setIndex: 0 },
      }),
    ]);

    if (!state) throw new Error("Expected session state");

    expect(getCompletedSets(state)).toEqual([]);
    expect(getTotalVolumeKg(state)).toBe(0);
    expect(getTotalReps(state)).toBe(0);
    expect(getExercisesCount(state)).toBe(0);
  });
});
