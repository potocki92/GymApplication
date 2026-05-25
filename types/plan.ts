import type { Workout } from "./workout";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface WorkoutDay {
  weekday: Weekday;
  rest: boolean;
  workout?: Workout;
}

export interface WeeklyPlan {
  id: string;
  /** ISO date of the Monday that starts this week. */
  weekStart: string;
  days: WorkoutDay[];
}
