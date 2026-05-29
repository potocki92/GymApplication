import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";
import { mapRowToRecord, type HistoryRow } from "@/lib/supabase-history";
import {
  buildSessionHistoryRecordsFromSets,
  mergeSessionHistoryRecords,
} from "@/lib/session-history-utils";
import type { ExerciseHistoryRecord, SessionHistoryRecord } from "@/types";

interface WorkoutNameRow {
  id: string;
  name: string | null;
}

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

function throwIfSupabaseError(error: { message?: string } | null): void {
  if (error) throw new Error(error.message ?? "Supabase write failed");
}

async function loadSessionsFromSetHistory(
  supabase: SupabaseClient,
  userId: string,
): Promise<SessionHistoryRecord[]> {
  const [historyRes, workoutsRes] = await Promise.all([
    supabase
      .from("exercise_history")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false }),
    supabase.from("workouts").select("id,name").eq("user_id", userId),
  ]);

  if (historyRes.error || !historyRes.data) return [];

  const workoutNames = new Map(
    ((workoutsRes.data as WorkoutNameRow[] | null) ?? [])
      .filter((row) => row.name)
      .map((row) => [row.id, row.name as string]),
  );
  const records: ExerciseHistoryRecord[] = (
    historyRes.data as HistoryRow[]
  ).map(mapRowToRecord);

  return buildSessionHistoryRecordsFromSets(records, workoutNames);
}

function backfillMissingSessions(
  supabase: SupabaseClient,
  sessions: SessionHistoryRecord[],
  userId: string,
): void {
  if (sessions.length === 0) return;

  void supabase
    .from("workout_sessions")
    .upsert(
      sessions.map((session) => sessionToRow(session, userId)),
      { onConflict: "id" },
    )
    .then(({ error }) => {
      if (error)
        console.error("Failed to backfill workout session history", error);
    });
}

export async function loadSessionsFromSupabase(
  userId: string,
): Promise<SessionHistoryRecord[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const [sessionsRes, historySessions] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("finished_at", { ascending: false }),
    loadSessionsFromSetHistory(supabase, userId),
  ]);

  const dbSessions =
    !sessionsRes.error && sessionsRes.data
      ? (sessionsRes.data as SessionRow[]).map(mapRowToSession)
      : [];
  const merged = mergeSessionHistoryRecords(dbSessions, historySessions);
  const dbSessionIds = new Set(dbSessions.map((session) => session.id));
  const missingSessions = historySessions.filter(
    (session) => !dbSessionIds.has(session.id),
  );

  backfillMissingSessions(supabase, missingSessions, userId);

  return merged;
}

export async function upsertSessionToSupabase(
  record: SessionHistoryRecord,
  userId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("workout_sessions")
    .upsert(sessionToRow(record, userId), { onConflict: "id" });
  throwIfSupabaseError(error);
}

export async function deleteSessionFromSupabase(
  id: string,
  userId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  throwIfSupabaseError(error);
}
