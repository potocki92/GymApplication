import { describe, expect, it } from "vitest";

import {
  classifyZone,
  computeZoneBounds,
  defaultMaxHr,
  resolveMaxHr,
} from "@/lib/heart-rate/zones";
import type { UserProfile } from "@/types";

const baseProfile = {
  maxHrBpm: null,
  restingHrBpm: null,
  hrZoneMethod: null,
  birthDate: null,
} satisfies Pick<
  UserProfile,
  "maxHrBpm" | "restingHrBpm" | "hrZoneMethod" | "birthDate"
>;

describe("defaultMaxHr", () => {
  it("returns null when birthDate is missing", () => {
    expect(defaultMaxHr(null)).toBeNull();
  });

  it("returns null when birthDate is unparseable", () => {
    expect(defaultMaxHr("not-a-date")).toBeNull();
  });

  it("derives 220 - age", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 30);
    const iso = dob.toISOString().slice(0, 10);
    const result = defaultMaxHr(iso);
    expect(result).not.toBeNull();
    // Allow ±1 for sub-day rounding around the birthday.
    expect(Math.abs((result ?? 0) - 190)).toBeLessThanOrEqual(1);
  });
});

describe("resolveMaxHr", () => {
  it("prefers explicit override over age-based default", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 30);
    const iso = dob.toISOString().slice(0, 10);
    expect(resolveMaxHr({ maxHrBpm: 185, birthDate: iso })).toBe(185);
  });

  it("falls back to default when override is null", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 25);
    const iso = dob.toISOString().slice(0, 10);
    expect(resolveMaxHr({ maxHrBpm: null, birthDate: iso })).toBe(
      defaultMaxHr(iso),
    );
  });

  it("returns null when nothing is known", () => {
    expect(resolveMaxHr({ maxHrBpm: null, birthDate: null })).toBeNull();
  });
});

describe("computeZoneBounds", () => {
  it("returns null when max HR cannot be resolved", () => {
    expect(computeZoneBounds(baseProfile)).toBeNull();
  });

  it("produces five contiguous zones from explicit max", () => {
    const bounds = computeZoneBounds({ ...baseProfile, maxHrBpm: 200 });
    expect(bounds).not.toBeNull();
    expect(bounds).toHaveLength(5);
    expect(bounds![0]).toMatchObject({ zone: 1, minBpm: 100, maxBpm: 120 });
    expect(bounds![1]).toMatchObject({ zone: 2, minBpm: 120, maxBpm: 140 });
    expect(bounds![2]).toMatchObject({ zone: 3, minBpm: 140, maxBpm: 160 });
    expect(bounds![3]).toMatchObject({ zone: 4, minBpm: 160, maxBpm: 180 });
    expect(bounds![4]).toMatchObject({ zone: 5, minBpm: 180, maxBpm: 200 });
  });

  it("falls back to %MHR when method is karvonen without rest HR", () => {
    const bounds = computeZoneBounds({
      ...baseProfile,
      maxHrBpm: 200,
      hrZoneMethod: "karvonen",
    });
    expect(bounds).not.toBeNull();
    expect(bounds![0]?.minBpm).toBe(100);
  });
});

describe("classifyZone", () => {
  const bounds = computeZoneBounds({ ...baseProfile, maxHrBpm: 200 })!;

  it("returns null for sub-Z1 readings", () => {
    expect(classifyZone(80, bounds)).toBeNull();
  });

  it("classifies at the lower edge (inclusive)", () => {
    expect(classifyZone(100, bounds)).toBe(1);
    expect(classifyZone(120, bounds)).toBe(2);
    expect(classifyZone(160, bounds)).toBe(4);
  });

  it("excludes the upper edge except for Z5", () => {
    expect(classifyZone(140, bounds)).toBe(3);
    expect(classifyZone(180, bounds)).toBe(5);
    expect(classifyZone(200, bounds)).toBe(5);
  });

  it("returns null above Z5", () => {
    expect(classifyZone(220, bounds)).toBeNull();
  });

  it("returns null on NaN", () => {
    expect(classifyZone(Number.NaN, bounds)).toBeNull();
  });
});
