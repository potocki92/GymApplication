import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  Equipment,
  ExperienceLevel,
  Gender,
  HrZoneMethod,
  PreferredWorkoutType,
  ThemePreference,
  TrainingGoalKey,
  UnitsLength,
  UnitsWeight,
  UserProfile,
} from "@/types";

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  onboarding_completed_at: string | null;
  gender: string | null;
  birth_date: string | null;
  height_cm: number | string | null;
  current_weight_kg: number | string | null;
  target_weight_kg: number | string | null;
  training_goal: string | null;
  experience_level: string | null;
  available_equipment: string[] | null;
  training_days_per_week: number | null;
  preferred_workout_duration_min: number | null;
  preferred_workout_types: string[] | null;
  units_weight: string | null;
  units_length: string | null;
  theme_preference: string | null;
  max_hr_bpm: number | null;
  resting_hr_bpm: number | null;
  hr_zone_method: string | null;
  notifications_enabled: boolean | null;
  notifications_workout_reminders: boolean | null;
  notifications_progress_updates: boolean | null;
  program_start_date: string | null;
  program_weeks: number | null;
  updated_at: string | null;
}

function num(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T | null,
): T | null {
  if (!value) return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function mapRowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    onboardingCompletedAt: row.onboarding_completed_at,
    gender: asEnum<Gender>(row.gender, ["male", "female", "other"], null),
    birthDate: row.birth_date,
    heightCm: num(row.height_cm),
    currentWeightKg: num(row.current_weight_kg),
    targetWeightKg: num(row.target_weight_kg),
    trainingGoal: asEnum<TrainingGoalKey>(
      row.training_goal,
      [
        "lose_fat",
        "gain_muscle",
        "maintain",
        "strength",
        "endurance",
        "general_fitness",
      ],
      null,
    ),
    experienceLevel: asEnum<ExperienceLevel>(
      row.experience_level,
      ["beginner", "intermediate", "advanced"],
      null,
    ),
    availableEquipment: ((row.available_equipment ?? []) as string[]).filter(
      (v): v is Equipment =>
        (
          [
            "barbell",
            "dumbbell",
            "machine",
            "cable",
            "bodyweight",
            "kettlebell",
            "bands",
            "cardio",
          ] as const
        ).includes(v as Equipment),
    ),
    trainingDaysPerWeek: row.training_days_per_week,
    preferredWorkoutDurationMin: row.preferred_workout_duration_min,
    preferredWorkoutTypes: ((row.preferred_workout_types ?? []) as string[]).filter(
      (v): v is PreferredWorkoutType =>
        (
          [
            "push_pull_legs",
            "full_body",
            "upper_lower",
            "split",
            "strength",
            "hiit",
            "cardio",
          ] as const
        ).includes(v as PreferredWorkoutType),
    ),
    unitsWeight: asEnum<UnitsWeight>(row.units_weight, ["kg", "lbs"], "kg") ?? "kg",
    unitsLength: asEnum<UnitsLength>(row.units_length, ["cm", "in"], "cm") ?? "cm",
    themePreference:
      asEnum<ThemePreference>(
        row.theme_preference,
        ["dark", "light", "system"],
        "dark",
      ) ?? "dark",
    maxHrBpm: num(row.max_hr_bpm),
    restingHrBpm: num(row.resting_hr_bpm),
    hrZoneMethod: asEnum<HrZoneMethod>(
      row.hr_zone_method,
      ["percent_mhr", "karvonen"],
      null,
    ),
    notificationsEnabled: row.notifications_enabled ?? true,
    notificationsWorkoutReminders: row.notifications_workout_reminders ?? true,
    notificationsProgressUpdates: row.notifications_progress_updates ?? true,
    programStartDate: row.program_start_date,
    programWeeks: num(row.program_weeks),
    updatedAt: row.updated_at,
  };
}

/** Whitelist of patchable columns mapped from camelCase → snake_case. */
const COLUMN_MAP: Record<keyof Omit<UserProfile, "id" | "email" | "updatedAt">, string> = {
  displayName: "display_name",
  onboardingCompletedAt: "onboarding_completed_at",
  gender: "gender",
  birthDate: "birth_date",
  heightCm: "height_cm",
  currentWeightKg: "current_weight_kg",
  targetWeightKg: "target_weight_kg",
  trainingGoal: "training_goal",
  experienceLevel: "experience_level",
  availableEquipment: "available_equipment",
  trainingDaysPerWeek: "training_days_per_week",
  preferredWorkoutDurationMin: "preferred_workout_duration_min",
  preferredWorkoutTypes: "preferred_workout_types",
  unitsWeight: "units_weight",
  unitsLength: "units_length",
  themePreference: "theme_preference",
  maxHrBpm: "max_hr_bpm",
  restingHrBpm: "resting_hr_bpm",
  hrZoneMethod: "hr_zone_method",
  notificationsEnabled: "notifications_enabled",
  notificationsWorkoutReminders: "notifications_workout_reminders",
  notificationsProgressUpdates: "notifications_progress_updates",
  programStartDate: "program_start_date",
  programWeeks: "program_weeks",
};

export type ProfilePatch = Partial<Omit<UserProfile, "id" | "email" | "updatedAt">>;

export function profilePatchToRow(patch: ProfilePatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const column = COLUMN_MAP[key as keyof typeof COLUMN_MAP];
    if (column == null) continue;
    row[column] = value;
  }
  return row;
}

function getClient(): SupabaseClient | null {
  return getSupabaseClient();
}

export async function fetchProfileFromSupabase(
  userId: string,
): Promise<UserProfile | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return mapRowToProfile(data as ProfileRow);
}

/**
 * Upserts the patch. We use `upsert` (not `update`) so that an existing user who
 * predates the on-signup trigger still gets a row created; the RLS `insert own`
 * policy added in the profile-expansion migration is what allows this.
 *
 * Throws on Supabase errors so callers can surface the real failure reason
 * (RLS denial, constraint violation, network) instead of a generic "save
 * failed" toast.
 */
export async function upsertProfileToSupabase(
  userId: string,
  patch: ProfilePatch,
): Promise<UserProfile | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const row = profilePatchToRow(patch);
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...row }, { onConflict: "id" })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRowToProfile(data as ProfileRow);
}
