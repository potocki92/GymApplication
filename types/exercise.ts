export type MuscleGroup =
  | "klatka"
  | "plecy"
  | "barki"
  | "biceps"
  | "triceps"
  | "nogi"
  | "posladki"
  | "brzuch"
  | "cardio"
  | "cale-cialo";

export type ExerciseCategory =
  | "sztanga"
  | "hantle"
  | "maszyna"
  | "wyciag"
  | "guma"
  | "masa-ciala"
  | "cardio";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  category: ExerciseCategory;
  /** lucide-react icon name, resolved in the UI layer. */
  icon?: string;
  /** Path to thumbnail illustration. Falls back to muscle-tinted icon when absent. */
  image?: string;
  defaultSets: number;
  /** Rep target as a range string, e.g. "8-12". */
  defaultReps: string;
  defaultRestSec: number;
  defaultWeightKg?: number;
}
