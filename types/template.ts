import type { WorkoutExercise, WorkoutType } from "./workout";

/**
 * Szablon treningu — wielokrotnego użytku „przepis" na trening. Trzyma te same
 * ćwiczenia co `Workout`, ale bez przypisania do dnia/planu i bez statusu
 * ukończenia. Zastosowanie szablonu klonuje go do świeżego `Workout`.
 */
export interface WorkoutTemplate {
  id: string;
  name: string;
  type?: WorkoutType;
  exercises: WorkoutExercise[];
  estimatedDurationMin: number;
  createdAt: number;
  /** Ile razy zastosowano szablon (do sortowania popularności). */
  usageCount: number;
}
