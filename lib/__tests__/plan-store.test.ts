import { describe, expect, it } from "vitest";

import {
  completedWorkoutIdsForWeek,
  selectNextWorkout,
  selectTodayWorkout,
  selectUpcomingDays,
  selectUpcomingWorkouts,
} from "@/store/use-plan-store";
import type {
  SessionHistoryRecord,
  Weekday,
  WeeklyPlan,
  Workout,
} from "@/types";

/** A Thursday — used as the explicit "today" reference in these tests. */
const THURSDAY = "2024-05-23";

function workout(
  partial: Partial<Workout> & Pick<Workout, "id" | "date" | "completed">,
): Workout {
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

function session(
  partial: Pick<SessionHistoryRecord, "id" | "workoutId" | "finishedAt">,
): SessionHistoryRecord {
  return {
    id: partial.id,
    workoutId: partial.workoutId,
    workoutName: partial.workoutId,
    startedAt: partial.finishedAt - 60_000,
    finishedAt: partial.finishedAt,
    totalActiveMs: 60_000,
    totalVolumeKg: 0,
    exercisesCount: 0,
    setsCompleted: 0,
    repsCompleted: 0,
  };
}

describe("selectNextWorkout", () => {
  it("ignores the stale template `completed` flag and returns today's workout", () => {
    // The recurring template carries a persistent `completed: true`; completion
    // for the active week must come from session history, not this flag.
    const plan: WeeklyPlan = {
      id: "plan-test",
      weekStart: "2024-05-20",
      days: [
        day("monday"),
        day("tuesday"),
        day("wednesday"),
        day(
          "thursday",
          workout({
            id: "flagged-today",
            completed: true,
            date: THURSDAY,
          }),
        ),
        day(
          "friday",
          workout({ id: "next-open", completed: false, date: "2024-05-24" }),
        ),
        day("saturday"),
        day("sunday"),
      ],
    };

    expect(selectNextWorkout(plan, new Set(), THURSDAY)?.id).toBe("flagged-today");
  });

  it("skips workouts completed in session history for the current week", () => {
    const completedIds = new Set(["completed-in-history"]);
    const plan: WeeklyPlan = {
      id: "plan-test",
      weekStart: "2024-05-20",
      days: [
        day("monday"),
        day("tuesday"),
        day("wednesday"),
        day(
          "thursday",
          workout({
            id: "completed-in-history",
            completed: false,
            date: THURSDAY,
          }),
        ),
        day(
          "friday",
          workout({ id: "next-open", completed: false, date: "2024-05-24" }),
        ),
        day("saturday"),
        day("sunday"),
      ],
    };

    expect(selectNextWorkout(plan, completedIds, THURSDAY)?.id).toBe(
      "next-open",
    );
  });

  it("returns workout dates anchored to the active calendar week", () => {
    const plan: WeeklyPlan = {
      id: "plan-test",
      weekStart: "2024-05-20",
      days: [
        day("monday"),
        day("tuesday"),
        day("wednesday"),
        day("thursday"),
        day(
          "friday",
          workout({ id: "friday", completed: false, date: "2024-05-24" }),
        ),
        day("saturday"),
        day("sunday"),
      ],
    };

    expect(selectNextWorkout(plan, new Set(), "2026-05-28")?.date).toBe(
      "2026-05-29",
    );
  });
});

describe("selectUpcomingDays", () => {
  it("returns only template days later in the week than today", () => {
    const plan: WeeklyPlan = {
      id: "plan-test",
      weekStart: "2024-05-20",
      days: [
        day("monday", workout({ id: "mon", completed: true, date: "2024-05-20" })),
        day("tuesday"),
        day("wednesday"),
        day("thursday", workout({ id: "thu", completed: false, date: "2024-05-23" })),
        day("friday"),
        day("saturday", workout({ id: "sat", completed: false, date: "2024-05-25" })),
        day("sunday"),
      ],
    };

    // Reference is a Thursday (index 3): only Fri/Sat/Sun qualify.
    const upcoming = selectUpcomingDays(plan, THURSDAY).map((d) => d.weekday);
    expect(upcoming).toEqual(["friday", "saturday", "sunday"]);
  });
});

describe("selectTodayWorkout", () => {
  const plan: WeeklyPlan = {
    id: "plan-test",
    weekStart: "2024-05-20",
    days: [
      day("monday"),
      day("tuesday"),
      day("wednesday"),
      day("thursday", workout({ id: "thu", completed: false, date: THURSDAY })),
      day("friday"),
      day("saturday"),
      day("sunday"),
    ],
  };

  it("returns today's workout dated to the active week", () => {
    const result = selectTodayWorkout(plan, new Set(), THURSDAY);
    expect(result?.id).toBe("thu");
    expect(result?.date).toBe(THURSDAY);
  });

  it("returns undefined on a rest day", () => {
    expect(selectTodayWorkout(plan, new Set(), "2024-05-24")).toBeUndefined();
  });

  it("returns undefined once the workout is completed this week", () => {
    expect(
      selectTodayWorkout(plan, new Set(["thu"]), THURSDAY),
    ).toBeUndefined();
  });
});

describe("selectUpcomingWorkouts", () => {
  const plan: WeeklyPlan = {
    id: "plan-test",
    weekStart: "2024-05-20",
    days: [
      day("monday", workout({ id: "mon", completed: true, date: "2024-05-20" })),
      day("tuesday"),
      day("wednesday"),
      day("thursday", workout({ id: "thu", completed: false, date: "2024-05-23" })),
      day("friday", workout({ id: "fri", completed: false, date: "2024-05-24" })),
      day("saturday"),
      day("sunday"),
    ],
  };

  it("includes today and later, flagging today and dating to the active week", () => {
    const upcoming = selectUpcomingWorkouts(plan, new Set(), "2026-05-28");
    // 2026-05-28 is a Thursday → Thu (today) + Fri.
    expect(upcoming.map((u) => u.workout.id)).toEqual(["thu", "fri"]);
    expect(upcoming[0]).toMatchObject({ isToday: true, date: "2026-05-28" });
    expect(upcoming[1]).toMatchObject({ isToday: false, date: "2026-05-29" });
  });

  it("excludes workouts already completed this week", () => {
    const upcoming = selectUpcomingWorkouts(plan, new Set(["thu"]), "2026-05-28");
    expect(upcoming.map((u) => u.workout.id)).toEqual(["fri"]);
  });
});

describe("completedWorkoutIdsForWeek", () => {
  it("includes only sessions finished in the same Monday-based week", () => {
    const ids = completedWorkoutIdsForWeek(
      [
        session({
          id: "previous",
          workoutId: "old",
          finishedAt: new Date("2026-05-24T12:00:00").getTime(),
        }),
        session({
          id: "current",
          workoutId: "current",
          finishedAt: new Date("2026-05-28T12:00:00").getTime(),
        }),
      ],
      new Date("2026-05-28T10:00:00"),
    );

    expect(ids.has("old")).toBe(false);
    expect(ids.has("current")).toBe(true);
  });
});
