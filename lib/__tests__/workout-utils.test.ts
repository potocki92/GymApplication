import { describe, expect, it } from "vitest";

import {
  averageReps,
  getExerciseCount,
  getWorkoutVolume,
  makeWorkoutExerciseId,
  reindexExercises,
} from "@/lib/workout-utils";
import type { Workout, WorkoutExercise } from "@/types";

function ex(
  partial: Partial<WorkoutExercise> & { id: string },
): WorkoutExercise {
  return {
    exerciseId: "ex-squat",
    sets: 3,
    reps: "8",
    weightKg: 50,
    restSec: 60,
    order: 0,
    ...partial,
  };
}

describe("averageReps", () => {
  it("averages a range", () => {
    expect(averageReps("8-12")).toBe(10);
  });

  it("parses a single value", () => {
    expect(averageReps("15")).toBe(15);
  });

  it("returns 0 for non-numeric input", () => {
    expect(averageReps("abc")).toBe(0);
  });

  it("handles whitespace around the dash", () => {
    expect(averageReps("8 - 12")).toBe(10);
  });
});

describe("reindexExercises", () => {
  it("assigns sequential 0-based order values", () => {
    const input = [
      ex({ id: "a", order: 5 }),
      ex({ id: "b", order: 99 }),
      ex({ id: "c", order: -3 }),
    ];
    const out = reindexExercises(input);
    expect(out.map((e) => e.order)).toEqual([0, 1, 2]);
    expect(out.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const input = [ex({ id: "a", order: 5 })];
    reindexExercises(input);
    expect(input[0].order).toBe(5);
  });
});

describe("getWorkoutVolume", () => {
  it("sums sets × avg reps × weight across exercises", () => {
    const workout = {
      exercises: [
        ex({ id: "1", sets: 3, reps: "10", weightKg: 100 }), // 3000
        ex({ id: "2", sets: 4, reps: "8-12", weightKg: 50 }), // 4 × 10 × 50 = 2000
      ],
    } as Workout;
    expect(getWorkoutVolume(workout)).toBe(5000);
  });

  it("returns 0 for a workout with no exercises", () => {
    expect(getWorkoutVolume({ exercises: [] } as unknown as Workout)).toBe(0);
  });
});

describe("getExerciseCount", () => {
  it("returns the exercise array length", () => {
    expect(
      getExerciseCount({
        exercises: [ex({ id: "a" }), ex({ id: "b" })],
      } as Workout),
    ).toBe(2);
  });
});

describe("makeWorkoutExerciseId", () => {
  it("formats workout id and order into a stable string", () => {
    expect(makeWorkoutExerciseId("w-push", 3)).toBe("w-push-ex-3");
  });
});
