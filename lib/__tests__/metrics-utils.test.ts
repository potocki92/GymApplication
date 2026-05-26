import { describe, expect, it } from "vitest";

import {
  latestForMetric,
  progressTier,
  progressToGoalPct,
  sma7,
  sortRecords,
} from "@/lib/metrics-utils";
import type { BodyMetricRecord } from "@/types";

function rec(partial: Partial<BodyMetricRecord> & { date: string }): BodyMetricRecord {
  return {
    id: partial.date,
    weightKg: 80,
    updatedAt: 0,
    ...partial,
  } as BodyMetricRecord;
}

describe("sortRecords", () => {
  it("sorts ascending by date", () => {
    const out = sortRecords([
      rec({ date: "2024-05-03" }),
      rec({ date: "2024-05-01" }),
      rec({ date: "2024-05-02" }),
    ]);
    expect(out.map((r) => r.date)).toEqual(["2024-05-01", "2024-05-02", "2024-05-03"]);
  });

  it("breaks ties on the same date by updatedAt", () => {
    const out = sortRecords([
      rec({ date: "2024-05-01", id: "later", updatedAt: 200 }),
      rec({ date: "2024-05-01", id: "earlier", updatedAt: 100 }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["earlier", "later"]);
  });

  it("does not mutate the input", () => {
    const input = [rec({ date: "2024-05-02" }), rec({ date: "2024-05-01" })];
    sortRecords(input);
    expect(input.map((r) => r.date)).toEqual(["2024-05-02", "2024-05-01"]);
  });
});

describe("sma7", () => {
  it("returns the value itself when only one data point exists", () => {
    const sorted = [rec({ date: "2024-05-10", weightKg: 80 })];
    expect(sma7(sorted, "weightKg")).toEqual([80]);
  });

  it("averages over the trailing 7-day calendar window", () => {
    const sorted = [
      rec({ date: "2024-05-01", weightKg: 80 }),
      rec({ date: "2024-05-04", weightKg: 82 }),
      rec({ date: "2024-05-07", weightKg: 84 }),
    ];
    // Day 7 window covers days 1..7 → all three values: (80 + 82 + 84) / 3 = 82
    const out = sma7(sorted, "weightKg");
    expect(out[2]).toBeCloseTo(82);
  });

  it("excludes values outside the 7-day window", () => {
    const sorted = [
      rec({ date: "2024-05-01", weightKg: 80 }),
      rec({ date: "2024-05-15", weightKg: 90 }), // 14 days later → window only sees itself
    ];
    const out = sma7(sorted, "weightKg");
    expect(out[1]).toBe(90);
  });

  it("returns NaN when no values in window for a sparse metric", () => {
    const sorted = [rec({ date: "2024-05-10", chestCm: undefined })];
    const out = sma7(sorted, "chestCm");
    expect(Number.isNaN(out[0])).toBe(true);
  });
});

describe("progressToGoalPct", () => {
  it("returns 100 when start equals target", () => {
    expect(progressToGoalPct(80, 80, 80)).toBe(100);
  });

  it("returns 0 at start", () => {
    expect(progressToGoalPct(80, 80, 70)).toBe(0);
  });

  it("returns 100 at target", () => {
    expect(progressToGoalPct(80, 70, 70)).toBe(100);
  });

  it("works for cuts (current between start and target)", () => {
    // start 80 → target 70, currently 75 → halfway → 50%
    expect(progressToGoalPct(80, 75, 70)).toBe(50);
  });

  it("works for bulks", () => {
    // start 70 → target 80, currently 75 → halfway → 50%
    expect(progressToGoalPct(70, 75, 80)).toBe(50);
  });

  it("clamps below 0", () => {
    expect(progressToGoalPct(80, 85, 70)).toBe(0);
  });

  it("clamps above 100", () => {
    expect(progressToGoalPct(80, 60, 70)).toBe(100);
  });
});

describe("progressTier", () => {
  it.each([
    [10, "behind"],
    [39.9, "behind"],
    [40, "on-track"],
    [74.9, "on-track"],
    [75, "ahead"],
    [100, "ahead"],
  ] as const)("classifies %f as %s", (pct, tier) => {
    expect(progressTier(pct)).toBe(tier);
  });
});

describe("latestForMetric", () => {
  it("returns the most recent record with a value", () => {
    const records = [
      rec({ date: "2024-05-01", weightKg: 80 }),
      rec({ date: "2024-05-05", weightKg: 78 }),
      rec({ date: "2024-05-10", weightKg: 76 }),
    ];
    expect(latestForMetric(records, "weightKg")?.date).toBe("2024-05-10");
  });

  it("skips records that don't have the metric set", () => {
    const records = [
      rec({ date: "2024-05-01", weightKg: 80, chestCm: 100 }),
      rec({ date: "2024-05-05", weightKg: 78 }), // chestCm undefined
    ];
    expect(latestForMetric(records, "chestCm")?.date).toBe("2024-05-01");
  });

  it("returns null when nothing matches", () => {
    expect(latestForMetric([], "weightKg")).toBeNull();
  });
});
