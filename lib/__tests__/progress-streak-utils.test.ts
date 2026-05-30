import { describe, expect, it } from "vitest";

import {
  buildPhotoMilestones,
  buildPhotoStreak,
  newCountMilestone,
  summarizeProgress,
} from "@/lib/progress-photos/streak-utils";
import type { ProgressPhotoRecord, ProgressPose } from "@/types";

function rec(
  takenAt: string,
  opts: Partial<ProgressPhotoRecord> = {},
): ProgressPhotoRecord {
  return {
    id: opts.id ?? `id-${takenAt}-${opts.pose ?? "front"}`,
    takenAt,
    pose: (opts.pose ?? "front") as ProgressPose,
    storagePath: "u/a.webp",
    thumbPath: "u/a.thumb.webp",
    weightKg: opts.weightKg ?? null,
    notes: opts.notes ?? null,
    width: opts.width ?? 900,
    height: opts.height ?? 1200,
    byteSize: opts.byteSize ?? 1000,
    createdAt: opts.createdAt ?? 0,
    updatedAt: opts.updatedAt ?? 0,
  };
}

// A fixed "now": Wed 2024-01-31 (week containing Mon 2024-01-29).
const NOW = Date.UTC(2024, 0, 31, 12);

describe("buildPhotoStreak", () => {
  it("returns zero for an empty library", () => {
    expect(buildPhotoStreak([], NOW)).toEqual({ weeks: 0, active: false });
  });

  it("counts the current week as a 1-week active streak", () => {
    expect(buildPhotoStreak([rec("2024-01-30")], NOW)).toEqual({
      weeks: 1,
      active: true,
    });
  });

  it("counts consecutive weeks walking backwards", () => {
    const photos = [
      rec("2024-01-30"), // current week
      rec("2024-01-23"), // -1 week
      rec("2024-01-16"), // -2 weeks
    ];
    expect(buildPhotoStreak(photos, NOW)).toEqual({ weeks: 3, active: true });
  });

  it("breaks the streak on a missing week", () => {
    const photos = [
      rec("2024-01-30"), // current
      rec("2024-01-16"), // gap at -1 week
    ];
    expect(buildPhotoStreak(photos, NOW)).toEqual({ weeks: 1, active: true });
  });

  it("keeps a one-week grace when the current week has no photo yet", () => {
    // Only last week has a photo → streak still active.
    expect(buildPhotoStreak([rec("2024-01-23")], NOW)).toEqual({
      weeks: 1,
      active: true,
    });
  });

  it("is inactive when the last photo is older than last week", () => {
    expect(buildPhotoStreak([rec("2024-01-01")], NOW)).toEqual({
      weeks: 0,
      active: false,
    });
  });
});

describe("summarizeProgress", () => {
  it("handles an empty library", () => {
    expect(summarizeProgress([])).toEqual({
      total: 0,
      spanDays: 0,
      firstWeightKg: null,
      lastWeightKg: null,
      weightDeltaKg: null,
    });
  });

  it("computes span and weight delta from first/last weigh-ins", () => {
    const photos = [
      rec("2024-01-01", { weightKg: 90 }),
      rec("2024-01-15", { weightKg: null }),
      rec("2024-02-01", { weightKg: 85.4 }),
    ];
    const s = summarizeProgress(photos);
    expect(s.total).toBe(3);
    expect(s.spanDays).toBe(31);
    expect(s.firstWeightKg).toBe(90);
    expect(s.lastWeightKg).toBe(85.4);
    expect(s.weightDeltaKg).toBe(-4.6);
  });

  it("leaves delta null with fewer than two weigh-ins", () => {
    expect(summarizeProgress([rec("2024-01-01", { weightKg: 90 })]).weightDeltaKg).toBeNull();
  });
});

describe("buildPhotoMilestones", () => {
  it("unlocks count milestones progressively", () => {
    const five = Array.from({ length: 5 }, (_, i) => rec(`2024-01-0${i + 1}`));
    const kinds = buildPhotoMilestones(five).map((m) => m.kind);
    expect(kinds).toContain("first");
    expect(kinds).toContain("count5");
    expect(kinds).not.toContain("count10");
  });

  it("unlocks firstComparison when a pose has two photos", () => {
    const photos = [
      rec("2024-01-01", { pose: "front", id: "a" }),
      rec("2024-01-08", { pose: "front", id: "b" }),
    ];
    expect(buildPhotoMilestones(photos).map((m) => m.kind)).toContain(
      "firstComparison",
    );
  });

  it("does not unlock firstComparison across different poses", () => {
    const photos = [
      rec("2024-01-01", { pose: "front", id: "a" }),
      rec("2024-01-08", { pose: "side", id: "b" }),
    ];
    expect(buildPhotoMilestones(photos).map((m) => m.kind)).not.toContain(
      "firstComparison",
    );
  });
});

describe("newCountMilestone", () => {
  it("detects a freshly crossed threshold", () => {
    expect(newCountMilestone(4, 5)).toEqual({ kind: "count5", value: 5 });
    expect(newCountMilestone(0, 1)).toEqual({ kind: "first", value: 1 });
  });

  it("returns null when no threshold is crossed", () => {
    expect(newCountMilestone(5, 6)).toBeNull();
    expect(newCountMilestone(10, 10)).toBeNull();
  });
});
