import { describe, expect, it } from "vitest";

import { REFERENCE_TODAY } from "@/data";
import { selectNextWorkout } from "@/store/use-plan-store";
import type { Weekday, WeeklyPlan, Workout } from "@/types";

function workout(partial: Partial<Workout> & Pick<Workout, "id" | "date" | "completed">): Workout {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    type: "Custom",
    exercises: [],
    estimatedDurationMin: partial.estimatedDurationMin ?? 45,
    completed: partial.completed,
    date: partial.date,
  };
}

function day(weekday: Weekday, workoutItem?: Workout) {
  return workoutItem
    ? { weekday, rest: false, workout: workoutItem }
    : { weekday, rest: true };
}

describe("selectNextWorkout", () => {
  it("skips completed workouts scheduled for today", () => {
    const plan: WeeklyPlan = {
      id: "plan-test",
      weekStart: "2024-05-20",
      days: [
        day("monday"),
        day("tuesday"),
        day("wednesday"),
        day(
          "thursday",
          workout({ id: "completed-today", completed: true, date: REFERENCE_TODAY }),
        ),
        day(
          "friday",
          workout({ id: "next-open", completed: false, date: "2024-05-24" }),
        ),
        day("saturday"),
        day("sunday"),
      ],
    };

    expect(selectNextWorkout(plan)?.id).toBe("next-open");
  });
});
