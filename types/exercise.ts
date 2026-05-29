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

export interface ExerciseTechniqueStep {
  title: string;
  description: string;
}

export interface ExerciseTechniqueMuscles {
  primary: string[];
  secondary?: string[];
}

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
  /** Optional animated or static technique preview used on the exercise detail sheet. */
  animationUrl?: string;
  /** Optional frame sequence for start/end technique previews. */
  animationFrames?: string[];
  instructions?: ExerciseTechniqueStep[];
  tips?: string[];
  mistakes?: string[];
  muscles?: ExerciseTechniqueMuscles;
  defaultSets: number;
  /** Rep target as a range string, e.g. "8-12". */
  defaultReps: string;
  defaultRestSec: number;
  defaultWeightKg?: number;
}
