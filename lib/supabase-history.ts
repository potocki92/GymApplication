import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";
import type { ExerciseHistoryRecord } from "@/types";

export interface HistoryRow {
  id: string;
  user_id: string;
  exercise_id: string;
  workout_id: string;
  session_id: string;
  set_number: number;
  reps: number;
  weight_kg: number | string;
  one_rm_kg: number | string;
  completed_at: string;
  rpe: number | null;
  notes: string | null;
}

export function mapRowToRecord(row: HistoryRow): ExerciseHistoryRecord {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    workoutId: row.workout_id,
    sessionId: row.session_id,
    setNumber: row.set_number,
    reps: row.reps,
    weightKg: Number(row.weight_kg),
    oneRMKg: Number(row.one_rm_kg),
    completedAt: new Date(row.completed_at).getTime(),
    rpe: row.rpe ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function recordToRow(
  r: ExerciseHistoryRecord,
  userId: string,
): Omit<HistoryRow, "weight_kg" | "one_rm_kg"> & {
  weight_kg: number;
  one_rm_kg: number;
} {
  return {
    id: r.id,
    user_id: userId,
    exercise_id: r.exerciseId,
    workout_id: r.workoutId,
    session_id: r.sessionId,
    set_number: r.setNumber,
    reps: r.reps,
    weight_kg: r.weightKg,
    one_rm_kg: r.oneRMKg,
    completed_at: new Date(r.completedAt).toISOString(),
    rpe: r.rpe ?? null,
    notes: r.notes ?? null,
  };
}

function getClient(): SupabaseClient | null {
  return getSupabaseClient();
}

export async function loadHistoryFromSupabase(
  userId: string,
): Promise<ExerciseHistoryRecord[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("exercise_history")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  if (error || !data) return [];
  return (data as HistoryRow[]).map(mapRowToRecord);
}

export async function appendHistoryToSupabase(
  records: ExerciseHistoryRecord[],
  userId: string,
): Promise<void> {
  if (records.length === 0) return;
  const supabase = getClient();
  if (!supabase) return;
  const rows = records.map((r) => recordToRow(r, userId));
  await supabase.from("exercise_history").upsert(rows, { onConflict: "id" });
}

export async function clearHistoryFromSupabase(userId: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  await supabase.from("exercise_history").delete().eq("user_id", userId);
}
