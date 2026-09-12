import type { ExerciseCategory, MuscleGroup, Weekday, WorkoutType } from "@/types";

export const APP_NAME = "REPIFY";

/** Training-style options offered when composing a workout. */
export const WORKOUT_TYPE_OPTIONS = [
  "Siła",
  "Hipertrofia",
  "Wytrzymałość",
  "Cardio",
  "Mobilność",
] as const satisfies readonly WorkoutType[];

/** Workout types selectable in the form (narrowed from {@link WorkoutType}). */
export type SelectableWorkoutType = (typeof WORKOUT_TYPE_OPTIONS)[number];

export const WEEKDAY_ORDER: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  "klatka",
  "plecy",
  "barki",
  "biceps",
  "triceps",
  "nogi",
  "posladki",
  "brzuch",
  "cardio",
  "cale-cialo",
];

export const EXERCISE_CATEGORY_ORDER: ExerciseCategory[] = [
  "sztanga",
  "hantle",
  "maszyna",
  "wyciag",
  "guma",
  "masa-ciala",
  "cardio",
];

/** Tinted muscle-group chips designed to read on the Athletic Brutalism dark
 *  surfaces. Written as literal class strings so Tailwind's compiler keeps them. */
/**
 * Muscle-group chips are intentionally uniform: the label already names the
 * group, so a per-group colour ramp added noise, not information. Kept as a map
 * (rather than one constant) because `ExerciseIcon` keys off the same shape and
 * a future single accent per group stays a one-line change.
 */
const MUSCLE_BADGE_CLASS = "bg-surface-interactive text-foreground";

export const MUSCLE_BADGE_CLASSES: Record<MuscleGroup, string> = {
  klatka: MUSCLE_BADGE_CLASS,
  plecy: MUSCLE_BADGE_CLASS,
  barki: MUSCLE_BADGE_CLASS,
  biceps: MUSCLE_BADGE_CLASS,
  triceps: MUSCLE_BADGE_CLASS,
  nogi: MUSCLE_BADGE_CLASS,
  posladki: MUSCLE_BADGE_CLASS,
  brzuch: MUSCLE_BADGE_CLASS,
  cardio: MUSCLE_BADGE_CLASS,
  "cale-cialo": MUSCLE_BADGE_CLASS,
};
