import { describe, expect, it } from "vitest";

import { mapRowToRecord, recordToRow } from "@/lib/supabase-history";
import { mapRowToMetric, metricToRow } from "@/lib/supabase-metrics";
import type { BodyMetricRecord, ExerciseHistoryRecord } from "@/types";

const USER_ID = "00000000-0000-0000-0000-000000000001";

describe("history mappers", () => {
  it("round-trips an ExerciseHistoryRecord through camel→snake→camel", () => {
    const record: ExerciseHistoryRecord = {
      id: "h-1",
      exerciseId: "ex-squat",
      workoutId: "w-1",
      sessionId: "s-1",
      setNumber: 2,
      reps: 5,
      weightKg: 102.5,
      oneRMKg: 115.3,
      completedAt: Date.UTC(2026, 4, 26, 12, 0, 0),
      rpe: 8,
      notes: "felt strong",
    };
    const row = recordToRow(record, USER_ID);
    const back = mapRowToRecord(row);
    expect(back).toEqual(record);
  });

  it("coerces numeric column strings back to numbers (postgres numeric type)", () => {
    const back = mapRowToRecord({
      id: "h-1",
      user_id: USER_ID,
      exercise_id: "ex-squat",
      workout_id: "w-1",
      session_id: "s-1",
      set_number: 1,
      reps: 5,
      weight_kg: "100.00",
      one_rm_kg: "112.50",
      completed_at: "2026-05-26T12:00:00.000Z",
      rpe: null,
      notes: null,
    });
    expect(back.weightKg).toBe(100);
    expect(back.oneRMKg).toBe(112.5);
    expect(back.rpe).toBeUndefined();
    expect(back.notes).toBeUndefined();
  });

  it("writes user_id, null-coalesces optional fields", () => {
    const row = recordToRow(
      {
        id: "h-1",
        exerciseId: "ex-squat",
        workoutId: "w-1",
        sessionId: "s-1",
        setNumber: 1,
        reps: 5,
        weightKg: 100,
        oneRMKg: 112.5,
        completedAt: 0,
      },
      USER_ID,
    );
    expect(row.user_id).toBe(USER_ID);
    expect(row.rpe).toBeNull();
    expect(row.notes).toBeNull();
  });
});

describe("metrics mappers", () => {
  it("round-trips a BodyMetricRecord through camel→snake→camel", () => {
    const record: BodyMetricRecord = {
      id: "m-1",
      date: "2026-05-26",
      weightKg: 80.4,
      chestCm: 102.5,
      waistCm: 84.1,
      hipsCm: 99.2,
      bodyFatPct: 18.5,
      notes: "morning weigh-in",
      updatedAt: Date.UTC(2026, 4, 26, 8, 0, 0),
    };
    const row = metricToRow(record, USER_ID);
    const back = mapRowToMetric(row);
    expect(back).toEqual(record);
  });

  it("treats null DB columns as undefined", () => {
    const back = mapRowToMetric({
      id: "m-1",
      user_id: USER_ID,
      date: "2026-05-26",
      weight_kg: "80.0",
      chest_cm: null,
      waist_cm: null,
      hips_cm: null,
      body_fat_pct: null,
      notes: null,
      updated_at: "2026-05-26T08:00:00.000Z",
    });
    expect(back.chestCm).toBeUndefined();
    expect(back.waistCm).toBeUndefined();
    expect(back.hipsCm).toBeUndefined();
    expect(back.bodyFatPct).toBeUndefined();
    expect(back.notes).toBeUndefined();
  });

  it("coerces postgres numeric strings back to numbers", () => {
    const back = mapRowToMetric({
      id: "m-1",
      user_id: USER_ID,
      date: "2026-05-26",
      weight_kg: "80.40",
      chest_cm: "102.5",
      waist_cm: "84.1",
      hips_cm: "99.2",
      body_fat_pct: "18.5",
      notes: null,
      updated_at: "2026-05-26T08:00:00.000Z",
    });
    expect(back.weightKg).toBeCloseTo(80.4);
    expect(back.chestCm).toBeCloseTo(102.5);
    expect(back.bodyFatPct).toBeCloseTo(18.5);
  });
});
