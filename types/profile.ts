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

  notificationsEnabled: boolean;
  notificationsWorkoutReminders: boolean;
  notificationsProgressUpdates: boolean;

  updatedAt: string | null;
}
