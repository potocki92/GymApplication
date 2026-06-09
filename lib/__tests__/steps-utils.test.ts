import { describe, expect, it } from "vitest";

import {
  bestDaySteps,
  buildDailySteps,
  sumStepsInLastDays,
  todaySteps,
  weeklyStepsAverage,
  weeklyStepsTotal,
} from "@/lib/steps-utils";
import type { AppleHealthSample } from "@/types";

/** Builds a steps sample anchored at local noon on the given YYYY-MM-DD. */
function stepsSample(date: string, value: number, id = date): AppleHealthSample {
  return {
    id,
    metric: "steps",
    value,
    unit: "count",
    startTime: `${date}T12:00:00`,
    endTime: null,
    source: "apple_health",
  };
}

const NOW = new Date("2026-06-09T10:00:00");

describe("buildDailySteps", () => {
  it("returns a dense series of N days ending today, zero-filled", () => {
    const points = buildDailySteps([], 7, NOW);
    expect(points).toHaveLength(7);
    expect(points.at(-1)?.date).toBe("2026-06-09");
    expect(points.every((p) => p.steps === 0)).toBe(true);
    expect(points.every((p) => p.sources.length === 0)).toBe(true);
  });

  it("sums multiple samples that fall on the same local day", () => {
    const samples = [
      stepsSample("2026-06-09", 1200, "a"),
      stepsSample("2026-06-09", 800, "b"),
    ];
    const points = buildDailySteps(samples, 3, NOW);
    const today = points.find((p) => p.date === "2026-06-09");
    expect(today?.steps).toBe(2000);
    expect(today?.sources).toEqual(["apple_health"]);
  });

  it("ignores non-steps metrics and non-positive values", () => {
    const samples: AppleHealthSample[] = [
      { ...stepsSample("2026-06-09", 500), metric: "avg_heart_rate" },
      stepsSample("2026-06-09", 0, "zero"),
      stepsSample("2026-06-09", 4321, "real"),
    ];
    const points = buildDailySteps(samples, 2, NOW);
    expect(points.find((p) => p.date === "2026-06-09")?.steps).toBe(4321);
  });
});

describe("steps aggregations", () => {
  const samples = [
    stepsSample("2026-06-09", 5000, "d0"),
    stepsSample("2026-06-08", 3000, "d1"),
    stepsSample("2026-06-01", 9000, "old"),
  ];
  const points = buildDailySteps(samples, 30, NOW);

  it("todaySteps reads the current local day", () => {
    expect(todaySteps(points, NOW)).toBe(5000);
  });

  it("sumStepsInLastDays / weeklyStepsTotal window the last 7 days", () => {
    expect(sumStepsInLastDays(points, 7, NOW)).toBe(8000);
    expect(weeklyStepsTotal(points, NOW)).toBe(8000);
  });

  it("weeklyStepsAverage divides the 7-day total by 7", () => {
    expect(weeklyStepsAverage(points, NOW)).toBe(Math.round(8000 / 7));
  });

  it("bestDaySteps returns the peak day across the series", () => {
    expect(bestDaySteps(points)).toBe(9000);
  });
});
