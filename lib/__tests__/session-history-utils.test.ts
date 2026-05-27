import { describe, expect, it } from "vitest";

import { buildSessionHistoryRecord } from "@/lib/session-history-utils";
import type { CompletedSession } from "@/types";

function set(
  id: string,
  setNumber: number,
  status: "completed" | "pending" | "skipped",
  reps: number | null,
  weight: number | null,
) {
  return {
    id,
    setNumber,
    status,
    targetReps: "8-12",
    targetWeightKg: 0,
    actualReps: reps,
    actualWeightKg: weight,
    restTargetSec: 90,
    startedAt: null,
    completedAt: null,
    rpe: null,
    notes: null,
  } as const;
}

function makeCompleted(): CompletedSession {
  return {
    id: "session-1",
    workoutId: "workout-A",
    workoutName: "Push Day",
    startedAt: 1_700_000_000_000,
    finishedAt: 1_700_000_360_000,
    totalActiveMs: 360_000,
    exercises: [
      {
        id: "ex-1",
        exerciseId: "bench",
        order: 1,
        targetReps: "8-12",
        targetWeightKg: 80,
        sets: [
          set("s1", 1, "completed", 10, 80),
          set("s2", 2, "completed", 8, 85),
          set("s3", 3, "skipped", null, null),
        ],
      },
      {
        id: "ex-2",
        exerciseId: "ohp",
        order: 2,
        targetReps: "8-12",
        targetWeightKg: 50,
        sets: [
          set("s4", 1, "completed", 10, 50),
          set("s5", 2, "pending", null, null),
        ],
      },
    ],
  };
}

describe("buildSessionHistoryRecord", () => {
  it("copies identity fields straight across", () => {
    const r = buildSessionHistoryRecord(makeCompleted());
    expect(r.id).toBe("session-1");
    expect(r.workoutId).toBe("workout-A");
    expect(r.workoutName).toBe("Push Day");
    expect(r.totalActiveMs).toBe(360_000);
  });

  it("counts only completed sets toward counters", () => {
    const r = buildSessionHistoryRecord(makeCompleted());
    expect(r.setsCompleted).toBe(3);
    expect(r.repsCompleted).toBe(10 + 8 + 10);
    expect(r.exercisesCount).toBe(2);
  });

  it("computes total volume from completed sets only", () => {
    const r = buildSessionHistoryRecord(makeCompleted());
    expect(r.totalVolumeKg).toBe(10 * 80 + 8 * 85 + 10 * 50);
  });

  it("passes through rating, note and HR placeholders", () => {
    const completed = {
      ...makeCompleted(),
      rating: 4,
      note: "felt strong",
      heartRate: { avgBpm: 142, maxBpm: 178 },
    };
    const r = buildSessionHistoryRecord(completed);
    expect(r.rating).toBe(4);
    expect(r.note).toBe("felt strong");
    expect(r.avgHrBpm).toBe(142);
    expect(r.maxHrBpm).toBe(178);
  });

  it("leaves HR fields undefined when no snapshot is attached", () => {
    const r = buildSessionHistoryRecord(makeCompleted());
    expect(r.avgHrBpm).toBeUndefined();
    expect(r.maxHrBpm).toBeUndefined();
  });
});
