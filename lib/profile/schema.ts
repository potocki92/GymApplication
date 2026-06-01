import { z } from "zod";

const GENDER_VALUES = ["male", "female", "other"] as const;
const TRAINING_GOAL_VALUES = [
  "lose_fat",
  "gain_muscle",
  "maintain",
  "strength",
  "endurance",
  "general_fitness",
] as const;
const EXPERIENCE_LEVEL_VALUES = ["beginner", "intermediate", "advanced"] as const;
const EQUIPMENT_VALUES = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "bands",
  "cardio",
] as const;
const WORKOUT_TYPE_VALUES = [
  "push_pull_legs",
  "full_body",
  "upper_lower",
  "split",
  "strength",
  "hiit",
  "cardio",
] as const;
const UNITS_WEIGHT_VALUES = ["kg", "lbs"] as const;
const UNITS_LENGTH_VALUES = ["cm", "in"] as const;
const THEME_VALUES = ["dark", "light", "system"] as const;

const displayName = z.string().trim().max(80);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return false;
    const minYear = new Date().getUTCFullYear() - 120;
    const maxYear = new Date().getUTCFullYear() - 10;
    return d.getUTCFullYear() >= minYear && d.getUTCFullYear() <= maxYear;
  }, "invalidDate");

/** A plain calendar date (no age bounds) — used for the training program start. */
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "invalidDate");

/** Required fields for the multi-step onboarding wizard. */
export const onboardingSchema = z.object({
  gender: z.enum(GENDER_VALUES),
  birthDate: isoDate,
  heightCm: z.number().min(80).max(260),
  currentWeightKg: z.number().min(25).max(400),
  targetWeightKg: z.number().min(25).max(400).optional(),
  trainingGoal: z.enum(TRAINING_GOAL_VALUES),
  experienceLevel: z.enum(EXPERIENCE_LEVEL_VALUES),
  availableEquipment: z.array(z.enum(EQUIPMENT_VALUES)).min(1, "pickAtLeastOne"),
  trainingDaysPerWeek: z.number().int().min(1).max(7),
  preferredWorkoutDurationMin: z.number().int().min(15).max(180),
  preferredWorkoutTypes: z.array(z.enum(WORKOUT_TYPE_VALUES)).min(1, "pickAtLeastOne"),
  unitsWeight: z.enum(UNITS_WEIGHT_VALUES),
  unitsLength: z.enum(UNITS_LENGTH_VALUES),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Partial schema reused by the settings tabs — every field optional so each tab
 *  can submit just its own slice. */
export const profileSettingsSchema = z.object({
  displayName: displayName.optional(),
  gender: z.enum(GENDER_VALUES).optional(),
  birthDate: isoDate.optional(),
  heightCm: z.number().min(80).max(260).optional(),
  currentWeightKg: z.number().min(25).max(400).optional(),
  targetWeightKg: z.number().min(25).max(400).optional(),
  trainingGoal: z.enum(TRAINING_GOAL_VALUES).optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVEL_VALUES).optional(),
  availableEquipment: z.array(z.enum(EQUIPMENT_VALUES)).optional(),
  trainingDaysPerWeek: z.number().int().min(1).max(7).optional(),
  preferredWorkoutDurationMin: z.number().int().min(15).max(180).optional(),
  preferredWorkoutTypes: z.array(z.enum(WORKOUT_TYPE_VALUES)).optional(),
  unitsWeight: z.enum(UNITS_WEIGHT_VALUES).optional(),
  unitsLength: z.enum(UNITS_LENGTH_VALUES).optional(),
  themePreference: z.enum(THEME_VALUES).optional(),
  notificationsEnabled: z.boolean().optional(),
  notificationsWorkoutReminders: z.boolean().optional(),
  notificationsProgressUpdates: z.boolean().optional(),
  programStartDate: calendarDate.optional(),
  programWeeks: z.number().int().min(1).max(52).optional(),
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
