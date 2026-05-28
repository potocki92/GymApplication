import type { ExerciseCategory, MuscleGroup, Weekday } from "@/types";

export const APP_NAME = "REPIFY";

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
export const MUSCLE_BADGE_CLASSES: Record<MuscleGroup, string> = {
  klatka: "bg-rose-500/15 text-rose-300",
  plecy: "bg-blue-500/15 text-blue-300",
  barki: "bg-amber-500/15 text-amber-300",
  biceps: "bg-violet-500/15 text-violet-300",
  triceps: "bg-fuchsia-500/15 text-fuchsia-300",
  nogi: "bg-emerald-500/15 text-emerald-300",
  posladki: "bg-pink-500/15 text-pink-300",
  brzuch: "bg-cyan-500/15 text-cyan-300",
  cardio: "bg-orange-500/15 text-orange-300",
  "cale-cialo": "bg-indigo-500/15 text-indigo-300",
};
