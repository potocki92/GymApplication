import {
  Activity,
  Bike,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  HeartPulse,
  Layers,
  Mountain,
  Move,
  Repeat,
  Scale,
  Target,
  TrendingUp,
  Trophy,
  User,
  UserCircle,
  UserSquare2,
  Zap,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import type {
  Equipment,
  ExperienceLevel,
  Gender,
  PreferredWorkoutType,
  TrainingGoalKey,
} from "@/types";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export interface OptionDef<TValue extends string> {
  value: TValue;
  label: string;
  description?: string;
  icon?: IconType;
}

export const GENDER_OPTIONS: OptionDef<Gender>[] = [
  { value: "male", label: "Mężczyzna", icon: User },
  { value: "female", label: "Kobieta", icon: UserCircle },
  { value: "other", label: "Inna", icon: UserSquare2 },
];

export const TRAINING_GOAL_OPTIONS: OptionDef<TrainingGoalKey>[] = [
  {
    value: "lose_fat",
    label: "Redukcja tkanki tłuszczowej",
    description: "Spal więcej kalorii niż dostarczasz",
    icon: Flame,
  },
  {
    value: "gain_muscle",
    label: "Budowa masy mięśniowej",
    description: "Hipertrofia + dodatni bilans kaloryczny",
    icon: Dumbbell,
  },
  {
    value: "maintain",
    label: "Utrzymanie formy",
    description: "Stabilna waga, dobra kondycja",
    icon: Scale,
  },
  {
    value: "strength",
    label: "Siła maksymalna",
    description: "Niskie zakresy powtórzeń, duże ciężary",
    icon: Trophy,
  },
  {
    value: "endurance",
    label: "Wytrzymałość",
    description: "Cardio i długie sesje",
    icon: Heart,
  },
  {
    value: "general_fitness",
    label: "Ogólna sprawność",
    description: "Zdrowie, mobilność, energia",
    icon: TrendingUp,
  },
];

export const EXPERIENCE_LEVEL_OPTIONS: OptionDef<ExperienceLevel>[] = [
  {
    value: "beginner",
    label: "Początkujący",
    description: "Mniej niż 6 miesięcy regularnych treningów",
  },
  {
    value: "intermediate",
    label: "Średniozaawansowany",
    description: "6 miesięcy – 2 lata regularnych treningów",
  },
  {
    value: "advanced",
    label: "Zaawansowany",
    description: "Powyżej 2 lat doświadczenia",
  },
];

export const EQUIPMENT_OPTIONS: OptionDef<Equipment>[] = [
  { value: "barbell", label: "Sztanga", icon: Dumbbell },
  { value: "dumbbell", label: "Hantle", icon: Dumbbell },
  { value: "machine", label: "Maszyny", icon: Layers },
  { value: "cable", label: "Wyciąg", icon: Move },
  { value: "bodyweight", label: "Masa ciała", icon: Footprints },
  { value: "kettlebell", label: "Kettlebell", icon: Mountain },
  { value: "bands", label: "Gumy oporowe", icon: Activity },
  { value: "cardio", label: "Sprzęt cardio", icon: Bike },
];

export const WORKOUT_TYPE_OPTIONS: OptionDef<PreferredWorkoutType>[] = [
  { value: "push_pull_legs", label: "Push / Pull / Legs", icon: Repeat },
  { value: "full_body", label: "Full Body", icon: Target },
  { value: "upper_lower", label: "Upper / Lower", icon: Layers },
  { value: "split", label: "Split (per grupa)", icon: Dumbbell },
  { value: "strength", label: "Siłowy", icon: Trophy },
  { value: "hiit", label: "HIIT", icon: Zap },
  { value: "cardio", label: "Cardio", icon: HeartPulse },
];

export const TRAINING_DAYS_OPTIONS: OptionDef<string>[] = [1, 2, 3, 4, 5, 6, 7].map(
  (n) => ({ value: String(n), label: String(n) }),
);

export const WORKOUT_DURATION_OPTIONS: OptionDef<string>[] = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "75", label: "75 min" },
  { value: "90", label: "90 min" },
  { value: "120", label: "120+ min" },
];
