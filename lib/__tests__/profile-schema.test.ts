import { describe, expect, it } from "vitest";

import {
  onboardingSchema,
  profileSettingsSchema,
} from "@/lib/profile/schema";

const validOnboarding = {
  gender: "male" as const,
  birthDate: "1990-05-12",
  heightCm: 182,
  currentWeightKg: 86.5,
  targetWeightKg: 80,
  trainingGoal: "lose_fat" as const,
  experienceLevel: "intermediate" as const,
  availableEquipment: ["barbell" as const, "dumbbell" as const],
  trainingDaysPerWeek: 4,
  preferredWorkoutDurationMin: 60,
  preferredWorkoutTypes: ["push_pull_legs" as const],
  unitsWeight: "kg" as const,
  unitsLength: "cm" as const,
};

describe("onboardingSchema", () => {
  it("accepts a fully-filled valid input", () => {
    const result = onboardingSchema.safeParse(validOnboarding);
    expect(result.success).toBe(true);
  });

  it("treats targetWeightKg as optional", () => {
    const { targetWeightKg: _omit, ...rest } = validOnboarding;
    void _omit;
    const result = onboardingSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range height", () => {
    const r = onboardingSchema.safeParse({ ...validOnboarding, heightCm: 50 });
    expect(r.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const r = onboardingSchema.safeParse({
      ...validOnboarding,
      birthDate: "12-05-1990",
    });
    expect(r.success).toBe(false);
  });

  it("rejects birth dates that imply age under 10", () => {
    const recent = `${new Date().getUTCFullYear() - 5}-01-01`;
    const r = onboardingSchema.safeParse({ ...validOnboarding, birthDate: recent });
    expect(r.success).toBe(false);
  });

  it("rejects empty equipment list", () => {
    const r = onboardingSchema.safeParse({
      ...validOnboarding,
      availableEquipment: [],
    });
    expect(r.success).toBe(false);
  });

  it("rejects trainingDaysPerWeek out of 1..7", () => {
    const r = onboardingSchema.safeParse({
      ...validOnboarding,
      trainingDaysPerWeek: 8,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown enum value for trainingGoal", () => {
    const r = onboardingSchema.safeParse({
      ...validOnboarding,
      trainingGoal: "not-a-goal" as unknown as typeof validOnboarding.trainingGoal,
    });
    expect(r.success).toBe(false);
  });
});

describe("profileSettingsSchema", () => {
  it("accepts an empty object (every field optional)", () => {
    const r = profileSettingsSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("validates a single field in isolation", () => {
    const r = profileSettingsSchema.safeParse({ trainingDaysPerWeek: 5 });
    expect(r.success).toBe(true);
  });

  it("accepts a profile display name", () => {
    const r = profileSettingsSchema.safeParse({ displayName: "Anna" });
    expect(r.success).toBe(true);
  });

  it("rejects overly long profile display names", () => {
    const r = profileSettingsSchema.safeParse({ displayName: "A".repeat(81) });
    expect(r.success).toBe(false);
  });

  it("still rejects invalid values when present", () => {
    const r = profileSettingsSchema.safeParse({ heightCm: 999 });
    expect(r.success).toBe(false);
  });

  it("accepts theme preferences", () => {
    for (const themePreference of ["dark", "light", "system"] as const) {
      const r = profileSettingsSchema.safeParse({ themePreference });
      expect(r.success).toBe(true);
    }
  });
});
