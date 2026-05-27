import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";
import type { SessionHistoryRecord } from "@/types";

interface SessionRow {
  id: string;
  user_id: string;
  workout_id: string;
  workout_name: string;
  started_at: string;
  finished_at: string;
  total_active_ms: number | string;
  total_volume_kg: number | string;
  exercises_count: number;
  sets_completed: number;
  reps_completed: number;
  rating: number | null;
  note: string | null;
  avg_hr_bpm: number | null;
  max_hr_bpm: number | null;
}

function num(v: number | string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function mapRowToSession(row: SessionRow): SessionHistoryRecord {
  return {
    id: row.id,
    workoutId: row.workout_id,
    workoutName: row.workout_name,
    startedAt: new Date(row.started_at).getTime(),
    finishedAt: new Date(row.finished_at).getTime(),
    totalActiveMs: num(row.total_active_ms),
    totalVolumeKg: num(row.total_volume_kg),
    exercisesCount: row.exercises_count,
    setsCompleted: row.sets_completed,
    repsCompleted: row.reps_completed,
    rating: row.rating ?? undefined,
    note: row.note ?? undefined,
    avgHrBpm: row.avg_hr_bpm ?? undefined,
    maxHrBpm: row.max_hr_bpm ?? undefined,
  };
}

export function sessionToRow(
  r: SessionHistoryRecord,
  userId: string,
): Omit<SessionRow, "user_id"> & { user_id: string } {
  return {
    id: r.id,
    user_id: userId,
    workout_id: r.workoutId,
    workout_name: r.workoutName,
    started_at: new Date(r.startedAt).toISOString(),
    finished_at: new Date(r.finishedAt).toISOString(),
    total_active_ms: r.totalActiveMs,
    total_volume_kg: r.totalVolumeKg,
    exercises_count: r.exercisesCount,
    sets_completed: r.setsCompleted,
    reps_completed: r.repsCompleted,
    rating: r.rating ?? null,
    note: r.note ?? null,
    avg_hr_bpm: r.avgHrBpm ?? null,
    max_hr_bpm: r.maxHrBpm ?? null,
  };
}

function getClient(): SupabaseClient | null {
  return getSupabaseClient();
}

export async function loadSessionsFromSupabase(
  userId: string,
): Promise<SessionHistoryRecord[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("finished_at", { ascending: false });
  if (error || !data) return [];
  return (data as SessionRow[]).map(mapRowToSession);
}

export async function upsertSessionToSupabase(
  record: SessionHistoryRecord,
  userId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  await supabase
    .from("workout_sessions")
    .upsert(sessionToRow(record, userId), { onConflict: "id" });
}

export async function deleteSessionFromSupabase(
  id: string,
  userId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
}
