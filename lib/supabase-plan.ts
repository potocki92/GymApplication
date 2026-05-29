import type { SupabaseClient } from "@supabase/supabase-js";

import { WEEK_START } from "@/data";
import { WEEKDAY_ORDER } from "@/lib/constants";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  Weekday,
  WeeklyPlan,
  Workout,
  WorkoutDay,
  WorkoutExercise,
  WorkoutType,
} from "@/types";

interface WorkoutRow {
  id: string;
  user_id: string;
  weekday: Weekday;
  rest: boolean;
  name: string | null;
  type: string | null;
  estimated_duration_min: number;
  completed: boolean;
}

interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  user_id: string;
  order_index: number;
  exercise_id: string;
  sets: number;
  reps: string;
  weight_kg: number | string;
  rest_sec: number;
}

function weekdayToISO(weekStart: string, weekday: Weekday): string {
  const offset = WEEKDAY_ORDER.indexOf(weekday);
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function mapExerciseRowToWorkoutExercise(row: WorkoutExerciseRow): WorkoutExercise {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    sets: row.sets,
    reps: row.reps,
    weightKg: Number(row.weight_kg),
    restSec: row.rest_sec,
    order: row.order_index,
  };
}

function getClient(): SupabaseClient | null {
  return getSupabaseClient();
}

function throwIfSupabaseError(error: { message?: string } | null): void {
  if (error) throw new Error(error.message ?? "Supabase write failed");
}

function emptyPlan(): WeeklyPlan {
  return {
    id: "plan-user",
    weekStart: WEEK_START,
    days: WEEKDAY_ORDER.map((weekday) => ({ weekday, rest: false })),
  };
}

export async function loadPlanFromSupabase(userId: string): Promise<WeeklyPlan> {
  const supabase = getClient();
  if (!supabase) return emptyPlan();

  const [workoutsRes, exercisesRes] = await Promise.all([
    supabase.from("workouts").select("*").eq("user_id", userId),
    supabase
      .from("workout_exercises")
      .select("*")
      .eq("user_id", userId)
      .order("order_index", { ascending: true }),
  ]);

  if (workoutsRes.error || exercisesRes.error) return emptyPlan();

  const exercisesByWorkout = new Map<string, WorkoutExercise[]>();
  for (const row of (exercisesRes.data as WorkoutExerciseRow[]) ?? []) {
    const list = exercisesByWorkout.get(row.workout_id) ?? [];
    list.push(mapExerciseRowToWorkoutExercise(row));
    exercisesByWorkout.set(row.workout_id, list);
  }

  const workoutsByWeekday = new Map<Weekday, WorkoutRow>();
  for (const row of (workoutsRes.data as WorkoutRow[]) ?? []) {
    workoutsByWeekday.set(row.weekday, row);
  }

  const days: WorkoutDay[] = WEEKDAY_ORDER.map((weekday) => {
    const row = workoutsByWeekday.get(weekday);
    if (!row) return { weekday, rest: false };
    if (row.rest) return { weekday, rest: true };
    const workout: Workout = {
      id: row.id,
      name: row.name ?? "",
      type: (row.type as WorkoutType | null) ?? undefined,
      exercises: exercisesByWorkout.get(row.id) ?? [],
      estimatedDurationMin: row.estimated_duration_min,
      completed: row.completed,
      date: weekdayToISO(WEEK_START, weekday),
    };
    return { weekday, rest: false, workout };
  });

  return { id: "plan-user", weekStart: WEEK_START, days };
}

export async function upsertWorkoutToSupabase(
  weekday: Weekday,
  workout: Workout,
  userId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;

  const { error: workoutError } = await supabase.from("workouts").upsert(
    {
      id: workout.id,
      user_id: userId,
      weekday,
      rest: false,
      name: workout.name,
      type: workout.type ?? null,
      estimated_duration_min: workout.estimatedDurationMin,
      completed: workout.completed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,weekday" },
  );

  // Replace-all is cheap (a handful of rows per workout) and avoids tracking
  // per-exercise diffs against the previous state.
  throwIfSupabaseError(workoutError);

  const { error: deleteExercisesError } = await supabase
    .from("workout_exercises")
    .delete()
    .eq("workout_id", workout.id);
  throwIfSupabaseError(deleteExercisesError);

  if (workout.exercises.length > 0) {
    const { error: insertExercisesError } = await supabase.from("workout_exercises").insert(
      workout.exercises.map((ex, idx) => ({
        id: ex.id,
        workout_id: workout.id,
        user_id: userId,
        order_index: idx,
        exercise_id: ex.exerciseId,
        sets: ex.sets,
        reps: ex.reps,
        weight_kg: ex.weightKg,
        rest_sec: ex.restSec,
      })),
    );
    throwIfSupabaseError(insertExercisesError);
  }
}

export async function removeWorkoutFromSupabase(
  weekday: Weekday,
  userId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  // cascade on workout_exercises via FK
  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("user_id", userId)
    .eq("weekday", weekday);
  throwIfSupabaseError(error);
}

export async function setRestInSupabase(
  weekday: Weekday,
  userId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  // Delete any prior workout for this slot (drops exercises via cascade) and
  // upsert a marker row with rest=true.
  const { error: deleteError } = await supabase
    .from("workouts")
    .delete()
    .eq("user_id", userId)
    .eq("weekday", weekday);
  throwIfSupabaseError(deleteError);

  const { error: insertError } = await supabase.from("workouts").insert({
    id: `rest-${userId}-${weekday}`,
    user_id: userId,
    weekday,
    rest: true,
    name: null,
    type: null,
    estimated_duration_min: 0,
    completed: false,
  });
  throwIfSupabaseError(insertError);
}

export async function setCompletedInSupabase(
  weekday: Weekday,
  userId: string,
  completed: boolean,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("workouts")
    .update({ completed, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("weekday", weekday)
    .eq("rest", false);
  throwIfSupabaseError(error);
}
