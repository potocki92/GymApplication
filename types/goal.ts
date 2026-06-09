/**
 * Cele użytkownika liczone automatycznie z istniejących danych.
 *
 * - `workouts_weekly` — liczba treningów w bieżącym tygodniu (historia sesji).
 * - `steps_daily` / `steps_weekly` — kroki dzienne / tygodniowe (Apple Health).
 *
 * Cel wagowy NIE jest tutaj modelowany — korzysta z istniejącego
 * `BodyMetricGoal` (waga docelowa z profilu/ustawień).
 */

export type GoalType = "workouts_weekly" | "steps_daily" | "steps_weekly";

export const GOAL_TYPES: readonly GoalType[] = [
  "workouts_weekly",
  "steps_daily",
  "steps_weekly",
] as const;

export interface Goal {
  id: string;
  type: GoalType;
  /** Wartość docelowa: liczba treningów lub liczba kroków. */
  target: number;
  createdAt: number;
}
