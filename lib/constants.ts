import type { ExerciseCategory, MuscleGroup, Weekday } from "@/types";

export const APP_NAME = "FitFlow";

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
  "masa-ciala",
  "cardio",
];

/** Soft, tinted badge styles per muscle group. Written as literal
 *  class strings so the Tailwind compiler can detect them. */
export const MUSCLE_BADGE_CLASSES: Record<MuscleGroup, string> = {
  klatka: "bg-rose-100 text-rose-700",
  plecy: "bg-blue-100 text-blue-700",
  barki: "bg-amber-100 text-amber-700",
  biceps: "bg-violet-100 text-violet-700",
  triceps: "bg-fuchsia-100 text-fuchsia-700",
  nogi: "bg-emerald-100 text-emerald-700",
  posladki: "bg-pink-100 text-pink-700",
  brzuch: "bg-cyan-100 text-cyan-700",
  cardio: "bg-orange-100 text-orange-700",
  "cale-cialo": "bg-indigo-100 text-indigo-700",
};
