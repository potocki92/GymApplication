import { describe, expect, it } from "vitest";

import {
  bestPRForExercise,
  calculate1RM,
  detectNewPRs,
  recentRecordsForExercise,
  topPRs,
} from "@/lib/pr-utils";
import type { CompletedSession, ExerciseHistoryRecord } from "@/types";

function rec(
  partial: Pick<ExerciseHistoryRecord, "id" | "exerciseId" | "oneRMKg"> &
    Partial<ExerciseHistoryRecord>,
): ExerciseHistoryRecord {
  return {
    workoutId: "w-1",
    sessionId: "s-1",
    setNumber: 1,
    reps: 5,
    weightKg: 100,
    completedAt: 0,
    ...partial,
  } as ExerciseHistoryRecord;
}

describe("calculate1RM (Brzycki)", () => {
  it("returns 0 for non-positive inputs", () => {
    expect(calculate1RM(0, 5)).toBe(0);
    expect(calculate1RM(100, 0)).toBe(0);
    expect(calculate1RM(-10, 5)).toBe(0);
  });

  it("returns the lift weight at 1 rep", () => {
    expect(calculate1RM(100, 1)).toBe(100);
  });

  it("applies Brzycki formula for reps in range", () => {
    // 100 × 36 / (37 - 5) = 112.5
    expect(calculate1RM(100, 5)).toBe(112.5);
  });

  it("caps reps at 12 so the divisor doesn't run away", () => {
    expect(calculate1RM(60, 20)).toBe(calculate1RM(60, 12));
  });
});

describe("bestPRForExercise", () => {
  it("returns null for empty history", () => {
    expect(bestPRForExercise([], "ex-squat")).toBeNull();
  });

  it("returns the highest-oneRMKg record for the exercise", () => {
    const records = [
      rec({ id: "1", exerciseId: "ex-squat", oneRMKg: 100 }),
      rec({ id: "2", exerciseId: "ex-squat", oneRMKg: 120 }),
      rec({ id: "3", exerciseId: "ex-bench", oneRMKg: 150 }),
    ];
    expect(bestPRForExercise(records, "ex-squat")?.id).toBe("2");
  });

  it("ignores records from other exercises", () => {
    const records = [rec({ id: "1", exerciseId: "ex-bench", oneRMKg: 200 })];
    expect(bestPRForExercise(records, "ex-squat")).toBeNull();
  });
});

describe("topPRs", () => {
  it("returns one entry per exercise, ranked descending by 1RM", () => {
    const records = [
      rec({ id: "1", exerciseId: "ex-squat", oneRMKg: 100 }),
      rec({ id: "2", exerciseId: "ex-squat", oneRMKg: 120 }),
      rec({ id: "3", exerciseId: "ex-bench", oneRMKg: 150 }),
      rec({ id: "4", exerciseId: "ex-deadlift", oneRMKg: 200 }),
    ];
    const top = topPRs(records, 2);
    expect(top).toHaveLength(2);
    expect(top[0].exerciseId).toBe("ex-deadlift");
    expect(top[1].exerciseId).toBe("ex-bench");
  });

  it("returns the BEST record per exercise (not the latest)", () => {
    const records = [
      rec({ id: "1", exerciseId: "ex-squat", oneRMKg: 120 }),
      rec({ id: "2", exerciseId: "ex-squat", oneRMKg: 100 }),
    ];
    expect(topPRs(records, 1)[0].bestRecord.id).toBe("1");
  });
});

describe("recentRecordsForExercise", () => {
  it("returns last N records newest first", () => {
    const records = [
      rec({ id: "1", exerciseId: "ex-squat", oneRMKg: 100, completedAt: 1 }),
      rec({ id: "2", exerciseId: "ex-squat", oneRMKg: 100, completedAt: 3 }),
      rec({ id: "3", exerciseId: "ex-squat", oneRMKg: 100, completedAt: 2 }),
      rec({ id: "4", exerciseId: "ex-bench", oneRMKg: 100, completedAt: 999 }),
    ];
    const recent = recentRecordsForExercise(records, "ex-squat", 2);
    expect(recent.map((r) => r.id)).toEqual(["2", "3"]);
  });
});

describe("detectNewPRs", () => {
  it("flags a set that beats prior 1RM history for that exercise", () => {
    const session: CompletedSession = {
      id: "s-1",
      workoutId: "w-1",
      startedAt: 0,
      finishedAt: 0,
      exercises: [
        {
          exerciseId: "ex-squat",
          sets: [
            {
              id: "set-1",
              status: "completed",
              actualReps: 5,
              actualWeightKg: 100, // 1RM ≈ 112.5
            },
          ],
        } as never,
      ],
    } as never;

    const prior: ExerciseHistoryRecord[] = [
      rec({ id: "p1", exerciseId: "ex-squat", oneRMKg: 110 }),
    ];

    const out = detectNewPRs(session, prior);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      exerciseId: "ex-squat",
      previousOneRMKg: 110,
      newOneRMKg: 112.5,
      setReps: 5,
      setWeightKg: 100,
    });
  });

  it("returns nothing when no set beats prior history", () => {
    const session: CompletedSession = {
      id: "s-1",
      workoutId: "w-1",
      startedAt: 0,
      finishedAt: 0,
      exercises: [
        {
          exerciseId: "ex-squat",
          sets: [
            {
              id: "set-1",
              status: "completed",
              actualReps: 5,
              actualWeightKg: 80, // 1RM = 90
            },
          ],
        } as never,
      ],
    } as never;

    const prior: ExerciseHistoryRecord[] = [
      rec({ id: "p1", exerciseId: "ex-squat", oneRMKg: 110 }),
    ];

    expect(detectNewPRs(session, prior)).toEqual([]);
  });

  it("ignores skipped / non-completed sets", () => {
    const session: CompletedSession = {
      id: "s-1",
      workoutId: "w-1",
      startedAt: 0,
      finishedAt: 0,
      exercises: [
        {
          exerciseId: "ex-squat",
          sets: [
            {
              id: "set-1",
              status: "skipped",
              actualReps: 10,
              actualWeightKg: 200,
            },
          ],
        } as never,
      ],
    } as never;

    expect(detectNewPRs(session, [])).toEqual([]);
  });

  it("uses 0 as previous when the exercise has no history", () => {
    const session: CompletedSession = {
      id: "s-1",
      workoutId: "w-1",
      startedAt: 0,
      finishedAt: 0,
      exercises: [
        {
          exerciseId: "ex-squat",
          sets: [
            {
              id: "set-1",
              status: "completed",
              actualReps: 5,
              actualWeightKg: 100,
            },
          ],
        } as never,
      ],
    } as never;

    const out = detectNewPRs(session, []);
    expect(out).toHaveLength(1);
    expect(out[0].previousOneRMKg).toBe(0);
  });
});
