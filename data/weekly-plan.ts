import type { WeeklyPlan, Workout, WorkoutExercise } from "@/types";

/** Stable persistence key for the recurring weekly template (a Monday). */
export const WEEK_START = "2024-05-20";

let exSeq = 0;
function we(
  exerciseId: string,
  sets: number,
  reps: string,
  weightKg: number,
  restSec: number,
): WorkoutExercise {
  const order = exSeq++;
  return {
    id: `wex-${order}`,
    exerciseId,
    sets,
    reps,
    weightKg,
    restSec,
    order,
  };
}

function workout(
  id: string,
  name: string,
  type: Workout["type"],
  estimatedDurationMin: number,
  completed: boolean,
  date: string,
  exercises: WorkoutExercise[],
): Workout {
  return {
    id,
    name,
    type,
    estimatedDurationMin,
    completed,
    date,
    exercises: exercises.map((ex, i) => ({ ...ex, order: i })),
  };
}

const legsMonday = workout(
  "w-legs-mon",
  "Nogi — Przysiady + Hip Thrust",
  "Nogi",
  60,
  true,
  "2024-05-20",
  [
    we("ex-squat", 4, "6-10", 100, 120),
    we("ex-lunges", 3, "10-12", 24, 90),
    we("ex-hip-thrust", 4, "8-12", 80, 90),
    we("ex-deadlift", 3, "5-8", 110, 120),
    we("ex-calf-raise", 4, "12-15", 60, 60),
    we("ex-crunches", 3, "15-20", 0, 45),
  ],
);

const pushTuesday = workout(
  "w-push-tue",
  "Push — Klatka + Barki + Triceps",
  "Push",
  60,
  true,
  "2024-05-21",
  [
    we("ex-bench-press", 4, "8-12", 80, 90),
    we("ex-incline-db-press", 4, "10-12", 30, 90),
    we("ex-ohp", 4, "8-10", 45, 90),
    we("ex-lateral-raise", 3, "12-15", 12, 60),
    we("ex-dips", 3, "8-12", 0, 90),
    we("ex-triceps-pushdown", 3, "12-15", 30, 60),
  ],
);

const pullThursday = workout(
  "w-pull-thu",
  "Pull — Plecy + Biceps",
  "Pull",
  55,
  false,
  "2024-05-23",
  [
    we("ex-deadlift", 3, "5-8", 120, 120),
    we("ex-pullup", 4, "6-10", 0, 90),
    we("ex-row", 4, "8-12", 70, 90),
    we("ex-lateral-raise", 3, "15-20", 8, 60),
    we("ex-biceps-curl", 3, "10-12", 16, 60),
  ],
);

const legsFriday = workout(
  "w-legs-fri",
  "Nogi — Wykroki + Łydki",
  "Nogi",
  60,
  true,
  "2024-05-24",
  [
    we("ex-squat", 4, "8-10", 90, 120),
    we("ex-lunges", 3, "10-12", 24, 90),
    we("ex-hip-thrust", 4, "10-12", 80, 90),
    we("ex-calf-raise", 4, "12-15", 60, 60),
    we("ex-crunches", 3, "15-20", 0, 45),
    we("ex-plank", 3, "45-60", 0, 45),
  ],
);

const fullBodySunday = workout(
  "w-fullbody-sun",
  "Full Body",
  "Full Body",
  65,
  false,
  "2024-05-26",
  [
    we("ex-squat", 3, "8-10", 90, 120),
    we("ex-bench-press", 3, "8-10", 75, 90),
    we("ex-row", 3, "8-12", 65, 90),
    we("ex-ohp", 3, "8-10", 40, 90),
    we("ex-deadlift", 3, "5-8", 110, 120),
    we("ex-pullup", 3, "6-10", 0, 90),
    we("ex-plank", 3, "45-60", 0, 45),
  ],
);

export const WEEKLY_PLAN: WeeklyPlan = {
  id: "plan-2024-05-20",
  weekStart: WEEK_START,
  days: [
    { weekday: "monday", rest: false, workout: legsMonday },
    { weekday: "tuesday", rest: false, workout: pushTuesday },
    { weekday: "wednesday", rest: true },
    { weekday: "thursday", rest: false, workout: pullThursday },
    { weekday: "friday", rest: false, workout: legsFriday },
    { weekday: "saturday", rest: true },
    { weekday: "sunday", rest: false, workout: fullBodySunday },
  ],
};
