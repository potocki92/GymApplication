import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  ActiveWorkoutSessionRecord,
  AppendWorkoutSessionEventInput,
  StartWorkoutSessionInput,
  WorkoutSessionEventRecord,
  WorkoutSessionJson,
  WorkoutSessionPersistenceStatus,
} from "@/types";

export interface WorkoutSessionRow {
  id: string;
  user_id: string;
  workout_id: string;
  workout_name: string;
  started_at: string;
  finished_at: string | null;
  total_active_ms: number | string;
  status: string;
  current_state: WorkoutSessionJson | null;
  version: number;
  device_id: string | null;
  last_event_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WorkoutSessionEventRow {
  id: string;
  session_id: string;
  user_id: string;
  event_type: string;
  payload: WorkoutSessionJson | null;
  client_event_id: string;
  device_id: string | null;
  sequence_number: number;
  created_at: string;
}

function getClient(): SupabaseClient | null {
  return getSupabaseClient();
}

function throwIfSupabaseError(error: { message?: string } | null): void {
  if (error) throw new Error(error.message ?? "Supabase request failed");
}

function num(v: number | string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function millis(iso: string | null | undefined): number | undefined {
  if (!iso) return undefined;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : undefined;
}

function asWorkoutSessionStatus(status: string): WorkoutSessionPersistenceStatus {
  if (status === "active" || status === "paused" || status === "completed") {
    return status;
  }
  throw new Error(`Unsupported workout session status: ${status}`);
}

function emptyJson(value: WorkoutSessionJson | null): WorkoutSessionJson {
  return value ?? {};
}

export function mapRowToWorkoutSession(
  row: WorkoutSessionRow,
): ActiveWorkoutSessionRecord {
  const startedAt = millis(row.started_at) ?? 0;
  return {
    id: row.id,
    userId: row.user_id,
    workoutId: row.workout_id,
    workoutName: row.workout_name,
    startedAt,
    finishedAt: millis(row.finished_at),
    totalActiveMs: num(row.total_active_ms),
    status: asWorkoutSessionStatus(row.status),
    currentState: emptyJson(row.current_state),
    version: row.version,
    deviceId: row.device_id,
    lastEventId: row.last_event_id,
    createdAt: millis(row.created_at),
    updatedAt: millis(row.updated_at),
  };
}

export function mapRowToWorkoutSessionEvent(
  row: WorkoutSessionEventRow,
): WorkoutSessionEventRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    eventType: row.event_type,
    payload: emptyJson(row.payload),
    clientEventId: row.client_event_id,
    deviceId: row.device_id,
    sequenceNumber: row.sequence_number,
    createdAt: millis(row.created_at) ?? 0,
  };
}

async function currentUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

export async function startWorkoutSession(
  input: StartWorkoutSessionInput,
): Promise<ActiveWorkoutSessionRecord | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("start_workout_session", {
    p_session_id: input.sessionId,
    p_workout_id: input.workoutId,
    p_workout_name: input.workoutName,
    p_device_id: input.deviceId ?? null,
    p_client_event_id: input.clientEventId,
    p_initial_state: input.initialState,
  });
  throwIfSupabaseError(error);

  return data ? mapRowToWorkoutSession(data as WorkoutSessionRow) : null;
}

export async function appendWorkoutSessionEvent(
  input: AppendWorkoutSessionEventInput,
): Promise<WorkoutSessionEventRecord | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("append_workout_session_event", {
    p_session_id: input.sessionId,
    p_event_type: input.eventType,
    p_payload: input.payload,
    p_client_event_id: input.clientEventId,
    p_device_id: input.deviceId ?? null,
    p_expected_version: input.expectedVersion,
    p_next_state: input.nextState,
    p_next_status: input.nextStatus,
  });
  throwIfSupabaseError(error);

  return data ? mapRowToWorkoutSessionEvent(data as WorkoutSessionEventRow) : null;
}

/**
 * Marks an active/paused session as completed server-side so it is no longer
 * returned by {@link getActiveWorkoutSession}. Called from the terminal session
 * flows (finish / save / discard) — sessions that end locally (e.g. `finishEarly`)
 * never emit a completing event, so without this their row stays `active` and the
 * next `startWorkoutSession` would resurrect it. Best-effort and idempotent: a no-op
 * when Supabase is not configured or the session is already completed.
 */
export async function completeWorkoutSession(sessionId: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;

  const userId = await currentUserId(supabase);
  if (!userId) return;

  const { error } = await supabase
    .from("workout_sessions")
    .update({ status: "completed", finished_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .in("status", ["active", "paused"]);
  throwIfSupabaseError(error);
}

export async function getActiveWorkoutSession(): Promise<ActiveWorkoutSessionRecord | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const userId = await currentUserId(supabase);
  if (!userId) return null;

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .order("updated_at", { ascending: false })
    .limit(1);
  throwIfSupabaseError(error);

  const row = ((data as WorkoutSessionRow[] | null) ?? [])[0];
  return row ? mapRowToWorkoutSession(row) : null;
}

export async function getWorkoutSessionEventsAfter(
  sessionId: string,
  sequenceNumber: number,
): Promise<WorkoutSessionEventRecord[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("workout_session_events")
    .select("*")
    .eq("session_id", sessionId)
    .gt("sequence_number", sequenceNumber)
    .order("sequence_number", { ascending: true });
  throwIfSupabaseError(error);

  return ((data as WorkoutSessionEventRow[] | null) ?? []).map(
    mapRowToWorkoutSessionEvent,
  );
}

export async function getWorkoutSessionById(
  sessionId: string,
): Promise<ActiveWorkoutSessionRecord | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .limit(1);
  throwIfSupabaseError(error);

  const row = ((data as WorkoutSessionRow[] | null) ?? [])[0];
  return row ? mapRowToWorkoutSession(row) : null;
}
