import { describe, expect, it } from "vitest";

import { templateToWorkout, workoutToTemplate } from "@/lib/template-utils";
import type { Workout } from "@/types";

function makeWorkout(): Workout {
  return {
    id: "w-original",
    name: "Push A",
    type: "Siła",
    completed: true,
    estimatedDurationMin: 55,
    exercises: [
      { id: "we-1", exerciseId: "ex-bench", sets: 4, reps: "8-12", weightKg: 80, restSec: 90, order: 0 },
      { id: "we-2", exerciseId: "ex-ohp", sets: 3, reps: "10", weightKg: 40, restSec: 60, order: 1 },
    ],
  };
}

describe("workoutToTemplate", () => {
  it("captures name/type/exercises and resets usage", () => {
    const template = workoutToTemplate(makeWorkout());
    expect(template.name).toBe("Push A");
    expect(template.type).toBe("Siła");
    expect(template.exercises).toHaveLength(2);
    expect(template.usageCount).toBe(0);
    expect(template.estimatedDurationMin).toBe(55);
  });
});

describe("templateToWorkout", () => {
  it("produces a fresh, non-completed workout with new ids", () => {
    const template = workoutToTemplate(makeWorkout());
    const workout = templateToWorkout(template);

    expect(workout.completed).toBe(false);
    expect(workout.id).not.toBe("w-original");
    expect(workout.name).toBe(template.name);
    expect(workout.exercises).toHaveLength(2);
    // Exercise instance ids must be regenerated so they don't collide.
    expect(workout.exercises.map((e) => e.id)).not.toEqual(["we-1", "we-2"]);
    // Order is reindexed and exercise references preserved.
    expect(workout.exercises.map((e) => e.order)).toEqual([0, 1]);
    expect(workout.exercises.map((e) => e.exerciseId)).toEqual([
      "ex-bench",
      "ex-ohp",
    ]);
  });

  it("recomputes duration when the template has none", () => {
    const template = { ...workoutToTemplate(makeWorkout()), estimatedDurationMin: 0 };
    const workout = templateToWorkout(template);
    expect(workout.estimatedDurationMin).toBeGreaterThan(0);
  });
});
