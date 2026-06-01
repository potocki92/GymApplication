export type Gender = "male" | "female" | "other";

export type TrainingGoalKey =
  | "lose_fat"
  | "gain_muscle"
  | "maintain"
  | "strength"
  | "endurance"
  | "general_fitness";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "bands"
  | "cardio";

export type PreferredWorkoutType =
  | "push_pull_legs"
  | "full_body"
  | "upper_lower"
  | "split"
  | "strength"
  | "hiit"
  | "cardio";

export type UnitsWeight = "kg" | "lbs";
export type UnitsLength = "cm" | "in";
export type ThemePreference = "dark" | "light" | "system";

/**
 * How the user's HR zones are computed from `maxHrBpm` (and optionally
 * `restingHrBpm`). The codebase only implements `percent_mhr` for now; the
 * enum carries `karvonen` so the migration and types are forward-compatible.
 */
export type HrZoneMethod = "percent_mhr" | "karvonen";

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  onboardingCompletedAt: string | null;

  gender: Gender | null;
  birthDate: string | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;

  trainingGoal: TrainingGoalKey | null;
  experienceLevel: ExperienceLevel | null;
  availableEquipment: Equipment[];
  trainingDaysPerWeek: number | null;
  preferredWorkoutDurationMin: number | null;
  preferredWorkoutTypes: PreferredWorkoutType[];

  unitsWeight: UnitsWeight;
  unitsLength: UnitsLength;
  themePreference: ThemePreference;

  /** Manual max HR override. Falls back to `220 - age` when null and birthDate known. */
  maxHrBpm: number | null;
  /** Resting HR — only used by the Karvonen zone method. */
  restingHrBpm: number | null;
  /** Defaults to `percent_mhr` once `maxHrBpm` is known. */
  hrZoneMethod: HrZoneMethod | null;

  notificationsEnabled: boolean;
  notificationsWorkoutReminders: boolean;
  notificationsProgressUpdates: boolean;

  /** ISO date the current training program started. Drives the "Week N/M" badge. */
  programStartDate: string | null;
  /** Total length of the current training program in weeks. */
  programWeeks: number | null;

  updatedAt: string | null;
}
