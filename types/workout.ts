export type WorkoutType =
  // Legacy split taxonomy used by seed data and historical workouts.
  | "Push"
  | "Pull"
  | "Nogi"
  | "Full Body"
  | "Custom"
  // Training-style taxonomy selectable when composing a workout.
  | "Siła"
  | "Hipertrofia"
  | "Wytrzymałość"
  | "Cardio"
  | "Mobilność";

/** A single exercise as configured inside a concrete workout. */
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: number;
  reps: string;
  weightKg: number;
  restSec: number;
  order: number;
}

export interface Workout {
  id: string;
  name: string;
  type?: WorkoutType;
  exercises: WorkoutExercise[];
  estimatedDurationMin: number;
  completed: boolean;
  /** ISO date the workout is scheduled for / was completed on. */
  date?: string;
}
