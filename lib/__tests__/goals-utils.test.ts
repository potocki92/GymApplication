import { describe, expect, it } from "vitest";

import {
  computeProgress,
  computeWeightGoalProgress,
  goalProgress,
  type GoalContext,
} from "@/lib/goals-utils";
import { buildDailySteps } from "@/lib/steps-utils";
import type { WeightSummary } from "@/lib/stats-utils";
import type { AppleHealthSample, Goal, SessionHistoryRecord } from "@/types";

const NOW = new Date("2026-06-09T10:00:00");

function session(finishedAt: number, id: string): SessionHistoryRecord {
  return {
    id,
    workoutId: `w-${id}`,
    workoutName: "Trening",
    startedAt: finishedAt - 3_600_000,
    finishedAt,
    totalActiveMs: 3_600_000,
    totalVolumeKg: 1000,
    exercisesCount: 4,
    setsCompleted: 12,
    repsCompleted: 120,
  };
}

function stepsSample(date: string, value: number): AppleHealthSample {
  return {
    id: date,
    metric: "steps",
    value,
    unit: "count",
    startTime: `${date}T12:00:00`,
    endTime: null,
    source: "apple_health",
  };
}

describe("computeProgress", () => {
  it("clamps to 0–100 and flags achievement", () => {
    expect(computeProgress(2, 4)).toEqual({
      current: 2,
      target: 4,
      progressPct: 50,
      achieved: false,
    });
    expect(computeProgress(5, 4).progressPct).toBe(100);
    expect(computeProgress(5, 4).achieved).toBe(true);
  });

  it("guards against non-positive targets", () => {
    expect(computeProgress(3, 0)).toEqual({
      current: 3,
      target: 0,
      progressPct: 0,
      achieved: false,
    });
  });
});

describe("goalProgress", () => {
  // Two sessions in the current ISO week (Mon 2026-06-08, Tue 2026-06-09).
  const sessions = [
    session(new Date("2026-06-08T18:00:00Z").getTime(), "a"),
    session(new Date("2026-06-09T07:00:00Z").getTime(), "b"),
  ];
  const daily = buildDailySteps(
    [stepsSample("2026-06-09", 6000), stepsSample("2026-06-08", 4000)],
    30,
    NOW,
  );
  const ctx: GoalContext = { sessions, daily };

  it("counts weekly workouts", () => {
    const goal: Goal = { id: "1", type: "workouts_weekly", target: 4, createdAt: 0 };
    const p = goalProgress(goal, ctx, NOW);
    expect(p.current).toBe(2);
    expect(p.progressPct).toBe(50);
  });

  it("reads today's steps for a daily steps goal", () => {
    const goal: Goal = { id: "2", type: "steps_daily", target: 10000, createdAt: 0 };
    expect(goalProgress(goal, ctx, NOW).current).toBe(6000);
  });

  it("sums the rolling week for a weekly steps goal", () => {
    const goal: Goal = { id: "3", type: "steps_weekly", target: 70000, createdAt: 0 };
    expect(goalProgress(goal, ctx, NOW).current).toBe(10000);
  });
});

describe("computeWeightGoalProgress", () => {
  it("maps a WeightSummary into a GoalProgress", () => {
    const summary: WeightSummary = {
      startKg: 90,
      currentKg: 85,
      targetKg: 80,
      deltaKg: 5,
      remainingKg: 5,
      progressPct: 50,
      direction: "cut",
    };
    expect(computeWeightGoalProgress(summary)).toEqual({
      current: 85,
      target: 80,
      progressPct: 50,
      achieved: false,
    });
  });
});
