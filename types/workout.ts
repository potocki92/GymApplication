export type WorkoutType = "Push" | "Pull" | "Nogi" | "Full Body" | "Cardio" | "Custom";

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
