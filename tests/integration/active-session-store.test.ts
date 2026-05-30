import { beforeEach, describe, expect, it } from "vitest";

import { useActiveSessionStore } from "@/store";
import type { Workout } from "@/types";

function makeWorkout(): Workout {
  return {
    id: "w-test",
    name: "Test workout",
    type: "Push",
    exercises: [
      {
        id: "we-1",
        exerciseId: "bench-press",
        order: 0,
        sets: 3,
        reps: "8-12",
        weightKg: 60,
        restSec: 60,
      },
      {
        id: "we-2",
        exerciseId: "overhead-press",
        order: 1,
        sets: 2,
        reps: "6-8",
        weightKg: 40,
        restSec: 90,
      },
    ],
    estimatedDurationMin: 45,
    completed: false,
  };
}

function reset() {
  useActiveSessionStore.setState({
    session: null,
    activeSession: null,
    serverVersion: null,
    hydrationStatus: "idle",
    past: [],
    future: [],
  });
}

function startAndBeginFirstSet(): void {
  const store = useActiveSessionStore.getState();
  store.start(makeWorkout());
  store.beginFirstSet();
}

describe("skipToNextExercise", () => {
  beforeEach(() => {
    reset();
  });

  it("marks remaining sets of the current exercise as skipped and activates the next exercise (from executing)", () => {
    startAndBeginFirstSet();

    useActiveSessionStore.getState().skipToNextExercise();

    const s = useActiveSessionStore.getState().session!;
    expect(s.currentExerciseIndex).toBe(1);
    expect(s.currentSetIndex).toBe(0);
    expect(s.status).toBe("executing");
    expect(s.restStartedAt).toBeNull();

    // All sets of exercise 0 should now be "skipped".
    expect(s.exercises[0].sets.every((st) => st.status === "skipped")).toBe(true);

    // First set of exercise 1 should now be "active" with prefilled actuals.
    const firstSet = s.exercises[1].sets[0];
    expect(firstSet.status).toBe("active");
    expect(firstSet.startedAt).not.toBeNull();
    expect(firstSet.actualReps).not.toBeNull();
    expect(firstSet.actualWeightKg).not.toBeNull();
  });

  it("from resting mid-exercise: pending sets become skipped, completed set is untouched", () => {
    startAndBeginFirstSet();
    // Finish set 1 of exercise 0 → status becomes "resting" (restSec=60 > 0).
    useActiveSessionStore.getState().completeSet();
    expect(useActiveSessionStore.getState().session!.status).toBe("resting");
    const completedSet =
      useActiveSessionStore.getState().session!.exercises[0].sets[0];
    expect(completedSet.status).toBe("completed");

    useActiveSessionStore.getState().skipToNextExercise();

    const s = useActiveSessionStore.getState().session!;
    expect(s.currentExerciseIndex).toBe(1);
    expect(s.currentSetIndex).toBe(0);
    expect(s.status).toBe("executing");
    expect(s.restStartedAt).toBeNull();

    // First set of exercise 0 stays "completed".
    expect(s.exercises[0].sets[0].status).toBe("completed");
    // Remaining sets become "skipped".
    expect(s.exercises[0].sets[1].status).toBe("skipped");
    expect(s.exercises[0].sets[2].status).toBe("skipped");
  });

  it("finishes the workout when called on the last exercise", () => {
    startAndBeginFirstSet();
    // Skip exercise 0 → now on exercise 1.
    useActiveSessionStore.getState().skipToNextExercise();
    expect(useActiveSessionStore.getState().session!.currentExerciseIndex).toBe(1);

    // Skip the only remaining exercise → workout finishes.
    useActiveSessionStore.getState().skipToNextExercise();

    const s = useActiveSessionStore.getState().session!;
    expect(s.status).toBe("finished");
    expect(s.finishedAt).not.toBeNull();
    expect(s.restStartedAt).toBeNull();
    // Sets of last exercise should also be skipped.
    expect(s.exercises[1].sets.every((st) => st.status === "skipped")).toBe(true);
  });

  it("does nothing when status is paused", () => {
    startAndBeginFirstSet();
    useActiveSessionStore.getState().pause();
    const before = useActiveSessionStore.getState().session!;
    const snapshot = JSON.stringify({
      currentExerciseIndex: before.currentExerciseIndex,
      currentSetIndex: before.currentSetIndex,
      status: before.status,
      sets: before.exercises.map((e) => e.sets.map((s) => s.status)),
    });

    useActiveSessionStore.getState().skipToNextExercise();

    const after = useActiveSessionStore.getState().session!;
    const after2 = JSON.stringify({
      currentExerciseIndex: after.currentExerciseIndex,
      currentSetIndex: after.currentSetIndex,
      status: after.status,
      sets: after.exercises.map((e) => e.sets.map((s) => s.status)),
    });
    expect(after2).toBe(snapshot);
  });

  it("is undoable: undo restores the prior cursor and set statuses", () => {
    startAndBeginFirstSet();
    const before = useActiveSessionStore.getState().session!;
    const beforeSnapshot = JSON.stringify({
      currentExerciseIndex: before.currentExerciseIndex,
      currentSetIndex: before.currentSetIndex,
      sets: before.exercises.map((e) => e.sets.map((s) => s.status)),
    });

    useActiveSessionStore.getState().skipToNextExercise();
    useActiveSessionStore.getState().undo();

    const after = useActiveSessionStore.getState().session!;
    const afterSnapshot = JSON.stringify({
      currentExerciseIndex: after.currentExerciseIndex,
      currentSetIndex: after.currentSetIndex,
      sets: after.exercises.map((e) => e.sets.map((s) => s.status)),
    });
    expect(afterSnapshot).toBe(beforeSnapshot);
  });

  it("does nothing when status is planning or finished", () => {
    useActiveSessionStore.getState().start(makeWorkout());
    expect(useActiveSessionStore.getState().session!.status).toBe("planning");

    useActiveSessionStore.getState().skipToNextExercise();
    expect(useActiveSessionStore.getState().session!.status).toBe("planning");

    // Now drive to finished and try again.
    useActiveSessionStore.getState().beginFirstSet();
    useActiveSessionStore.getState().finishEarly();
    expect(useActiveSessionStore.getState().session!.status).toBe("finished");

    useActiveSessionStore.getState().skipToNextExercise();
    expect(useActiveSessionStore.getState().session!.status).toBe("finished");
  });
});
