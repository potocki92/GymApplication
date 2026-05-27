import { describe, expect, it } from "vitest";

import { formatDistance, formatDuration, formatGarminActivity } from "@/lib/garmin/format";
import { garminActivityToSessionRecord } from "@/lib/garmin/history-mapper";
import type { GarminActivity } from "@/types/garmin";

describe("formatDistance", () => {
  it("returns null for null / non-positive values", () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(0)).toBeNull();
  });

  it("formats sub-kilometre distances in metres", () => {
    expect(formatDistance(400)).toBe("400 m");
  });

  it("formats kilometre distances with two decimals", () => {
    expect(formatDistance(5230)).toBe("5.23 km");
  });
});

describe("formatDuration", () => {
  it("returns null for zero", () => {
    expect(formatDuration(0)).toBeNull();
  });

  it("formats minutes only when < 1h", () => {
    expect(formatDuration(45 * 60)).toBe("45min");
  });

  it("formats hours + minutes when >= 1h", () => {
    expect(formatDuration(3600 + 25 * 60)).toBe("1h 25min");
  });
});

describe("formatGarminActivity", () => {
  it("yields a complete summary for a run", () => {
    const activity: GarminActivity = {
      id: "1", garminActivityId: "g-1", activityType: "running",
      startTime: "2026-05-01T08:00:00Z", durationSeconds: 2700,
      distanceMeters: 7500, calories: 480, avgHeartRateBpm: 150,
      maxHeartRateBpm: 175, avgSpeedMps: 2.78, elevationGainM: 45, hrZones: null,
    };
    const s = formatGarminActivity(activity);
    expect(s.distance).toBe("7.50 km");
    expect(s.duration).toBe("45min");
    expect(s.avgHr).toBe("150 bpm");
    expect(s.calories).toBe("480 kcal");
  });
});

describe("garminActivityToSessionRecord", () => {
  it("maps a Garmin activity into the history record shape with source=garmin", () => {
    const activity: GarminActivity = {
      id: "1", garminActivityId: "g-99", activityType: "cycling",
      startTime: "2026-05-01T10:00:00Z", durationSeconds: 1800,
      distanceMeters: 12_000, calories: 320, avgHeartRateBpm: 140,
      maxHeartRateBpm: 170, avgSpeedMps: null, elevationGainM: null, hrZones: null,
    };
    const record = garminActivityToSessionRecord(activity);
    expect(record.source).toBe("garmin");
    expect(record.externalActivityId).toBe("g-99");
    expect(record.activityType).toBe("cycling");
    expect(record.distanceMeters).toBe(12_000);
    expect(record.calories).toBe(320);
    expect(record.avgHrBpm).toBe(140);
    // Duration mapped to ms; finishedAt = startedAt + duration.
    expect(record.totalActiveMs).toBe(1800 * 1000);
    expect(record.finishedAt - record.startedAt).toBe(1800 * 1000);
    // Volume/sets/reps default to 0 for cardio.
    expect(record.totalVolumeKg).toBe(0);
    expect(record.setsCompleted).toBe(0);
    expect(record.id).toBe("garmin:g-99");
  });
});
