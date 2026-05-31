import { describe, expect, it } from "vitest";

import {
  buildActivityCalendar,
  buildLongestStreak,
  buildMeasurementDeltas,
  buildStrengthProgress,
  buildTimeline,
  buildWeeklyActivity,
  buildWeeklyTotals,
  buildWeightSummary,
  buildWorkoutCounts,
  buildWorkoutStreak,
  countSessionsInWeeks,
  pickMotivation,
} from "@/lib/stats-utils";
import type {
  BodyMetricGoal,
  BodyMetricRecord,
  ExerciseHistoryRecord,
  SessionHistoryRecord,
} from "@/types";

function metric(partial: Partial<BodyMetricRecord> & { date: string }): BodyMetricRecord {
  return {
    id: partial.date,
    weightKg: 80,
    updatedAt: 0,
    ...partial,
  } as BodyMetricRecord;
}

function session(partial: Partial<SessionHistoryRecord> & { id: string; finishedAt: number }): SessionHistoryRecord {
  const { id, finishedAt, ...rest } = partial;

  return {
    workoutId: "w1",
    workoutName: "Test",
    totalActiveMs: 60_000,
    totalVolumeKg: 1000,
    exercisesCount: 3,
    setsCompleted: 9,
    repsCompleted: 90,
    ...rest,
    id,
    startedAt: finishedAt - 60_000,
    finishedAt,
  };
}

function exHistory(partial: Partial<ExerciseHistoryRecord> & { id: string; completedAt: number; oneRMKg: number; exerciseId: string }): ExerciseHistoryRecord {
  const { id, exerciseId, completedAt, oneRMKg, ...rest } = partial;

  return {
    workoutId: "w1",
    sessionId: "s1",
    setNumber: 1,
    reps: 5,
    weightKg: 100,
    ...rest,
    id,
    exerciseId,
    completedAt,
    oneRMKg,
  };
}

describe("buildWeightSummary", () => {
  it("uses earliest record as start when no goal is set", () => {
    const records = [
      metric({ date: "2024-01-01", weightKg: 115 }),
      metric({ date: "2024-06-01", weightKg: 108 }),
    ];
    const out = buildWeightSummary(records, null, null, null);
    expect(out.startKg).toBe(115);
    expect(out.currentKg).toBe(108);
    expect(out.deltaKg).toBe(7);
  });

  it("computes cut progress from start → current toward target", () => {
    const records = [
      metric({ date: "2024-01-01", weightKg: 115 }),
      metric({ date: "2024-06-01", weightKg: 108 }),
    ];
    const goal: BodyMetricGoal = { metric: "weightKg", startKg: 115, targetKg: 95 };
    const out = buildWeightSummary(records, goal, null, null);
    expect(out.direction).toBe("cut");
    expect(out.progressPct).toBe(35);
    expect(out.remainingKg).toBe(13);
  });

  it("clamps progress to 0..100 when overshooting", () => {
    const records = [metric({ date: "2024-06-01", weightKg: 90 })];
    const goal: BodyMetricGoal = { metric: "weightKg", startKg: 115, targetKg: 95 };
    const out = buildWeightSummary(records, goal, null, null);
    expect(out.progressPct).toBe(100);
    expect(out.remainingKg).toBe(0);
  });

  it("returns nulls when there are no records", () => {
    const out = buildWeightSummary([], null, null, null);
    expect(out.currentKg).toBeNull();
    expect(out.progressPct).toBeNull();
  });

  it("computes bulk direction when target is higher than start", () => {
    const records = [
      metric({ date: "2024-01-01", weightKg: 70 }),
      metric({ date: "2024-06-01", weightKg: 75 }),
    ];
    const goal: BodyMetricGoal = { metric: "weightKg", startKg: 70, targetKg: 80 };
    const out = buildWeightSummary(records, goal, null, null);
    expect(out.direction).toBe("bulk");
    expect(out.progressPct).toBe(50);
  });
});

describe("buildWorkoutCounts", () => {
  it("counts total, week and month from session list", () => {
    const now = new Date("2024-05-15T12:00:00Z"); // Wed
    const sessions = [
      session({ id: "1", finishedAt: now.getTime() }),
      session({ id: "2", finishedAt: now.getTime() - 24 * 60 * 60 * 1000 }),
      session({ id: "3", finishedAt: now.getTime() - 10 * 24 * 60 * 60 * 1000 }),
      session({ id: "4", finishedAt: new Date("2023-12-01").getTime() }),
    ];
    const counts = buildWorkoutCounts(sessions, now);
    expect(counts.total).toBe(4);
    expect(counts.thisWeek).toBe(2);
    expect(counts.thisMonth).toBe(3);
    expect(counts.last30Days).toBe(3);
  });

  it("emits null trend when there's no prior 30-day window", () => {
    const now = new Date("2024-05-15T12:00:00Z");
    const counts = buildWorkoutCounts(
      [session({ id: "1", finishedAt: now.getTime() })],
      now,
    );
    expect(counts.trendPct).toBeNull();
  });
});

describe("buildWeeklyActivity", () => {
  it("emits dense series with zero buckets for inactive weeks", () => {
    const now = new Date("2024-05-15T12:00:00Z");
    const out = buildWeeklyActivity([], 4, now);
    expect(out).toHaveLength(4);
    expect(out.every((d) => d.count === 0)).toBe(true);
  });

  it("counts sessions in their correct ISO week", () => {
    const now = new Date("2024-05-15T12:00:00Z"); // Wed in W20
    const sessions = [
      session({ id: "1", finishedAt: now.getTime() }),
      session({ id: "2", finishedAt: new Date("2024-05-13T12:00:00Z").getTime() }), // Mon W20
    ];
    const out = buildWeeklyActivity(sessions, 4, now);
    expect(out.at(-1)?.count).toBe(2);
  });
});

describe("buildWorkoutStreak", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date("2024-05-15T12:00:00Z"); // Wed

  it("counts consecutive days ending today", () => {
    const sessions = [
      session({ id: "1", finishedAt: now.getTime() }),
      session({ id: "2", finishedAt: now.getTime() - DAY }),
      session({ id: "3", finishedAt: now.getTime() - 2 * DAY }),
    ];
    expect(buildWorkoutStreak(sessions, now)).toBe(3);
  });

  it("stops at the first missing day", () => {
    const sessions = [
      session({ id: "1", finishedAt: now.getTime() }),
      session({ id: "3", finishedAt: now.getTime() - 2 * DAY }), // gap on day -1
    ];
    expect(buildWorkoutStreak(sessions, now)).toBe(1);
  });

  it("still counts when today has no workout yet but yesterday did", () => {
    const sessions = [session({ id: "1", finishedAt: now.getTime() - DAY })];
    expect(buildWorkoutStreak(sessions, now)).toBe(1);
  });

  it("returns 0 when the latest workout is older than yesterday", () => {
    const sessions = [session({ id: "1", finishedAt: now.getTime() - 5 * DAY })];
    expect(buildWorkoutStreak(sessions, now)).toBe(0);
  });

  it("returns 0 for an empty history", () => {
    expect(buildWorkoutStreak([], now)).toBe(0);
  });
});

describe("buildWeeklyTotals", () => {
  it("sums only the current ISO week and converts duration to minutes", () => {
    const now = new Date("2024-05-15T12:00:00Z"); // Wed, week starts Mon 05-13
    const sessions = [
      session({ id: "1", finishedAt: now.getTime() }),
      session({
        id: "2",
        finishedAt: new Date("2024-05-13T12:00:00Z").getTime(),
        calories: 500,
      }),
      session({ id: "3", finishedAt: new Date("2024-05-10T12:00:00Z").getTime() }), // prev week
    ];
    const totals = buildWeeklyTotals(sessions, now);
    expect(totals.workouts).toBe(2);
    expect(totals.durationMin).toBe(2); // 2 × 60_000ms
    expect(totals.volumeKg).toBe(2000); // 2 × 1000kg
    expect(totals.kcal).toBe(500);
  });
});

describe("buildActivityCalendar", () => {
  const now = new Date("2024-05-15T12:00:00Z");

  it("emits a dense Monday→Sunday grid of weeks×7 days", () => {
    const days = buildActivityCalendar([], 2, now);
    expect(days).toHaveLength(14);
    expect(days[0].date).toBe("2024-05-06"); // Monday
    expect(days.at(-1)?.date).toBe("2024-05-19"); // Sunday
    expect(days.every((d) => d.level === 0)).toBe(true);
  });

  it("maps daily session counts to heat levels", () => {
    const day = new Date("2024-05-15T12:00:00Z").getTime();
    const single = buildActivityCalendar(
      [session({ id: "1", finishedAt: day })],
      2,
      now,
    ).find((d) => d.date === "2024-05-15");
    expect(single?.level).toBe(2);

    const triple = buildActivityCalendar(
      [
        session({ id: "1", finishedAt: day }),
        session({ id: "2", finishedAt: day }),
        session({ id: "3", finishedAt: day }),
      ],
      2,
      now,
    ).find((d) => d.date === "2024-05-15");
    expect(triple?.level).toBe(4);
  });
});

describe("buildMeasurementDeltas", () => {
  it("computes start, current and signed delta per metric", () => {
    const records = [
      metric({ date: "2024-01-01", weightKg: 100, waistCm: 90 }),
      metric({ date: "2024-06-01", weightKg: 92, waistCm: 84 }),
    ];
    const deltas = buildMeasurementDeltas(records);
    const weight = deltas.find((d) => d.metric === "weightKg")!;
    expect(weight.startValue).toBe(100);
    expect(weight.currentValue).toBe(92);
    expect(weight.deltaAbs).toBe(-8);

    const waist = deltas.find((d) => d.metric === "waistCm")!;
    expect(waist.deltaAbs).toBe(-6);
  });

  it("returns nulls for metrics that were never recorded", () => {
    const records = [metric({ date: "2024-01-01", weightKg: 80 })];
    const deltas = buildMeasurementDeltas(records);
    const chest = deltas.find((d) => d.metric === "chestCm")!;
    expect(chest.startValue).toBeNull();
    expect(chest.deltaAbs).toBeNull();
  });
});

describe("buildStrengthProgress", () => {
  it("emits best 1RM per day, sorted ascending by date", () => {
    const recs = [
      exHistory({ id: "a", exerciseId: "bench", completedAt: new Date("2024-01-02T10:00:00Z").getTime(), oneRMKg: 100 }),
      exHistory({ id: "b", exerciseId: "bench", completedAt: new Date("2024-01-02T11:00:00Z").getTime(), oneRMKg: 105 }),
      exHistory({ id: "c", exerciseId: "squat", completedAt: new Date("2024-01-03T10:00:00Z").getTime(), oneRMKg: 120 }),
    ];
    const out = buildStrengthProgress(recs);
    expect(out).toHaveLength(2);
    expect(out[0].topOneRMKg).toBe(105);
    expect(out[1].topOneRMKg).toBe(120);
  });
});

describe("buildTimeline", () => {
  it("includes first workout, first weight and PR milestones", () => {
    const recs = [
      exHistory({ id: "h1", exerciseId: "bench", completedAt: 1000, oneRMKg: 100 }),
      exHistory({ id: "h2", exerciseId: "bench", completedAt: 2000, oneRMKg: 110 }),
    ];
    const events = buildTimeline(
      [session({ id: "s1", finishedAt: 1500, workoutName: "Push" })],
      [metric({ date: "2024-01-01", weightKg: 80 })],
      null,
      recs,
    );
    const types = events.map((e) => e.type);
    expect(types).toContain("first_workout");
    expect(types).toContain("first_weight");
    expect(types).toContain("pr_milestone");
  });

  it("emits 25/50/75 milestones when crossed", () => {
    const goal: BodyMetricGoal = { metric: "weightKg", startKg: 100, targetKg: 80 };
    const metrics = [
      metric({ date: "2024-01-01", weightKg: 100 }),
      metric({ date: "2024-02-01", weightKg: 95 }), // 25%
      metric({ date: "2024-03-01", weightKg: 90 }), // 50%
    ];
    const events = buildTimeline([], metrics, goal, []);
    const milestones = events
      .filter((e) => e.type === "weight_milestone")
      .map((e) => e.title);
    expect(milestones).toContain("25% celu osiągnięte");
    expect(milestones).toContain("50% celu osiągnięte");
  });
});

describe("pickMotivation", () => {
  it("celebrates a reached goal", () => {
    const out = pickMotivation(
      {
        startKg: 100,
        currentKg: 80,
        targetKg: 80,
        deltaKg: 20,
        remainingKg: 0,
        progressPct: 100,
        direction: "cut",
      },
      { total: 5, thisWeek: 1, thisMonth: 3, last30Days: 5, trendPct: 0 },
    );
    expect(out.tone).toBe("success");
  });

  it("nudges users who skipped this week", () => {
    const out = pickMotivation(
      {
        startKg: 100,
        currentKg: 99,
        targetKg: 80,
        deltaKg: 1,
        remainingKg: 19,
        progressPct: 5,
        direction: "cut",
      },
      { total: 3, thisWeek: 0, thisMonth: 1, last30Days: 2, trendPct: -50 },
    );
    expect(out.tone).toBe("warning");
  });

  it("offers a starter message when there's no data", () => {
    const out = pickMotivation(
      {
        startKg: null,
        currentKg: null,
        targetKg: null,
        deltaKg: null,
        remainingKg: null,
        progressPct: null,
        direction: null,
      },
      { total: 0, thisWeek: 0, thisMonth: 0, last30Days: 0, trendPct: null },
    );
    expect(out.tone).toBe("neutral");
  });
});

describe("buildLongestStreak", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const base = Date.UTC(2024, 4, 1, 12); // 2024-05-01 noon UTC

  it("returns 0 with no sessions", () => {
    expect(buildLongestStreak([])).toBe(0);
  });

  it("finds the longest consecutive-day run, ignoring gaps", () => {
    const sessions = [
      session({ id: "a", finishedAt: base }), // day 0
      session({ id: "b", finishedAt: base + DAY }), // day 1
      session({ id: "c", finishedAt: base + 2 * DAY }), // day 2
      session({ id: "d", finishedAt: base + 5 * DAY }), // gap, day 5
    ];
    expect(buildLongestStreak(sessions)).toBe(3);
  });

  it("collapses multiple sessions on the same day", () => {
    const sessions = [
      session({ id: "a", finishedAt: base }),
      session({ id: "b", finishedAt: base + 3 * 60 * 60 * 1000 }),
    ];
    expect(buildLongestStreak(sessions)).toBe(1);
  });
});

describe("countSessionsInWeeks", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date(Date.UTC(2024, 4, 30, 12));

  it("counts only sessions within the window", () => {
    const sessions = [
      session({ id: "recent", finishedAt: now.getTime() - DAY }),
      session({ id: "old", finishedAt: now.getTime() - 100 * DAY }),
    ];
    expect(countSessionsInWeeks(sessions, 4, now)).toBe(1);
  });
});
