import { describe, expect, it } from "vitest";

import { computeHrZones } from "@/lib/garmin/zones";
import type { GarminHeartRateSample } from "@/types/garmin";

function sample(seconds: number, bpm: number): GarminHeartRateSample {
  return {
    garminActivityId: "test",
    ts: new Date(0 + seconds * 1000).toISOString(),
    bpm,
  };
}

describe("computeHrZones", () => {
  it("returns empty zones for fewer than two samples", () => {
    expect(computeHrZones([])).toEqual({
      z1Seconds: 0, z2Seconds: 0, z3Seconds: 0, z4Seconds: 0, z5Seconds: 0,
    });
    expect(computeHrZones([sample(0, 130)])).toEqual({
      z1Seconds: 0, z2Seconds: 0, z3Seconds: 0, z4Seconds: 0, z5Seconds: 0,
    });
  });

  it("bins sample intervals into the right zones using %MHR=190", () => {
    // 10s @ 100 bpm (52% → Z1), 10s @ 135 (71% → Z3), 10s @ 180 (94% → Z5)
    const samples = [
      sample(0, 100),
      sample(10, 100),
      sample(20, 135),
      sample(30, 180),
    ];
    const zones = computeHrZones(samples, 190);
    expect(zones.z1Seconds).toBe(10);
    expect(zones.z3Seconds).toBe(10);
    expect(zones.z5Seconds).toBe(10);
    expect(zones.z2Seconds).toBe(0);
    expect(zones.z4Seconds).toBe(0);
  });

  it("ignores gaps greater than 60 seconds (treats as device pause)", () => {
    const samples = [sample(0, 140), sample(120, 140)];
    expect(computeHrZones(samples, 190).z3Seconds).toBe(0);
  });
});
