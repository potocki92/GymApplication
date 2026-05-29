import { describe, expect, it } from "vitest";

import { profilePatchToRow } from "@/lib/supabase-profile";

describe("profilePatchToRow", () => {
  it("maps camelCase keys to snake_case columns", () => {
    const row = profilePatchToRow({
      displayName: "Anna",
      heightCm: 180,
      trainingDaysPerWeek: 5,
      unitsWeight: "kg",
      themePreference: "dark",
      notificationsEnabled: true,
    });

    expect(row).toEqual({
      display_name: "Anna",
      height_cm: 180,
      training_days_per_week: 5,
      units_weight: "kg",
      theme_preference: "dark",
      notifications_enabled: true,
    });
  });

  it("preserves array values for multi-selects", () => {
    const row = profilePatchToRow({
      availableEquipment: ["barbell", "dumbbell"],
      preferredWorkoutTypes: ["push_pull_legs", "hiit"],
    });

    expect(row.available_equipment).toEqual(["barbell", "dumbbell"]);
    expect(row.preferred_workout_types).toEqual(["push_pull_legs", "hiit"]);
  });

  it("ignores unknown keys silently", () => {
    const row = profilePatchToRow({
      // @ts-expect-error intentionally unknown to test the whitelist
      bogus: "value",
      heightCm: 175,
    });

    expect(row).toEqual({ height_cm: 175 });
  });

  it("returns an empty object for empty patch", () => {
    expect(profilePatchToRow({})).toEqual({});
  });

  it("maps HR-zone fields to their snake_case columns", () => {
    const row = profilePatchToRow({
      maxHrBpm: 190,
      restingHrBpm: 58,
      hrZoneMethod: "percent_mhr",
    });

    expect(row).toEqual({
      max_hr_bpm: 190,
      resting_hr_bpm: 58,
      hr_zone_method: "percent_mhr",
    });
  });
});
