import type { SupabaseClient } from "@supabase/supabase-js";

import type { GarminActivityDto } from "@/lib/garmin/api-client";
import type {
  GarminActivity,
  GarminHeartRateSample,
  GarminSyncLog,
  GarminSyncStatus,
  GarminSyncTrigger,
  HrZoneBreakdown,
  IntegrationStatus,
  UserIntegration,
  UserIntegrationWithTokens,
} from "@/types/garmin";

const PROVIDER = "garmin" as const;

// ─── Row shapes ─────────────────────────────────────────────────────────────

interface UserIntegrationRow {
  id: string;
  user_id: string;
  provider: string;
  status: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  external_user_id: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface GarminActivityRow {
  id: string;
  user_id: string;
  garmin_activity_id: string;
  activity_type: string;
  start_time: string;
  duration_seconds: number;
  distance_meters: string | number | null;
  calories: number | null;
  avg_heart_rate_bpm: number | null;
  max_heart_rate_bpm: number | null;
  avg_speed_mps: string | number | null;
  elevation_gain_m: string | number | null;
  hr_zones: HrZoneBreakdown | null;
  created_at: string;
}

interface GarminSyncLogRow {
  id: string;
  user_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  activities_synced: number;
  samples_synced: number;
  error_message: string | null;
  trigger: string;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function num(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function asStatus(v: string): IntegrationStatus {
  return v === "connected" || v === "disconnected" || v === "error" || v === "expired"
    ? v
    : "disconnected";
}

function asSyncStatus(v: string): GarminSyncStatus {
  return v === "success" || v === "partial" || v === "error" || v === "in_progress"
    ? v
    : "in_progress";
}

function asTrigger(v: string): GarminSyncTrigger {
  return v === "manual" || v === "scheduled" || v === "webhook" ? v : "manual";
}

function mapIntegrationRowSafe(row: UserIntegrationRow): UserIntegration {
  return {
    id: row.id,
    provider: PROVIDER,
    status: asStatus(row.status),
    externalUserId: row.external_user_id,
    connectedAt: row.connected_at,
    lastSyncAt: row.last_sync_at,
    lastError: row.last_error,
  };
}

function mapIntegrationRowWithTokens(row: UserIntegrationRow): UserIntegrationWithTokens {
  return {
    ...mapIntegrationRowSafe(row),
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: row.token_expires_at,
    scope: row.scope,
  };
}

function mapActivityRow(row: GarminActivityRow): GarminActivity {
  return {
    id: row.id,
    garminActivityId: row.garmin_activity_id,
    activityType: row.activity_type,
    startTime: row.start_time,
    durationSeconds: row.duration_seconds,
    distanceMeters: num(row.distance_meters),
    calories: row.calories,
    avgHeartRateBpm: row.avg_heart_rate_bpm,
    maxHeartRateBpm: row.max_heart_rate_bpm,
    avgSpeedMps: num(row.avg_speed_mps),
    elevationGainM: num(row.elevation_gain_m),
    hrZones: row.hr_zones,
  };
}

function mapSyncLogRow(row: GarminSyncLogRow): GarminSyncLog {
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: asSyncStatus(row.status),
    activitiesSynced: row.activities_synced,
    samplesSynced: row.samples_synced,
    errorMessage: row.error_message,
    trigger: asTrigger(row.trigger),
  };
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export async function fetchGarminIntegration(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserIntegrationWithTokens | null> {
  const { data, error } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", PROVIDER)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapIntegrationRowWithTokens(data as UserIntegrationRow);
}

export async function fetchGarminIntegrationSafe(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserIntegration | null> {
  const row = await fetchGarminIntegration(supabase, userId);
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    externalUserId: row.externalUserId,
    connectedAt: row.connectedAt,
    lastSyncAt: row.lastSyncAt,
    lastError: row.lastError,
  };
}

export interface GarminIntegrationPatch {
  status?: IntegrationStatus;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  scope?: string | null;
  externalUserId?: string | null;
  connectedAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
}

export async function upsertGarminIntegration(
  supabase: SupabaseClient,
  userId: string,
  patch: GarminIntegrationPatch,
): Promise<UserIntegrationWithTokens> {
  const row: Record<string, unknown> = {
    user_id: userId,
    provider: PROVIDER,
    updated_at: new Date().toISOString(),
  };
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.accessToken !== undefined) row.access_token = patch.accessToken;
  if (patch.refreshToken !== undefined) row.refresh_token = patch.refreshToken;
  if (patch.tokenExpiresAt !== undefined) row.token_expires_at = patch.tokenExpiresAt;
  if (patch.scope !== undefined) row.scope = patch.scope;
  if (patch.externalUserId !== undefined) row.external_user_id = patch.externalUserId;
  if (patch.connectedAt !== undefined) row.connected_at = patch.connectedAt;
  if (patch.lastSyncAt !== undefined) row.last_sync_at = patch.lastSyncAt;
  if (patch.lastError !== undefined) row.last_error = patch.lastError;

  const { data, error } = await supabase
    .from("user_integrations")
    .upsert(row, { onConflict: "user_id,provider" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapIntegrationRowWithTokens(data as UserIntegrationRow);
}

export async function clearGarminIntegrationTokens(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await upsertGarminIntegration(supabase, userId, {
    status: "disconnected",
    accessToken: null,
    refreshToken: null,
    tokenExpiresAt: null,
    scope: null,
  });
}

export async function upsertGarminActivities(
  supabase: SupabaseClient,
  userId: string,
  activities: readonly (GarminActivityDto & { hrZones?: HrZoneBreakdown | null })[],
): Promise<number> {
  if (activities.length === 0) return 0;

  const rows = activities.map((a) => ({
    user_id: userId,
    garmin_activity_id: a.garminActivityId,
    activity_type: a.activityType,
    start_time: a.startTime,
    duration_seconds: a.durationSeconds,
    distance_meters: a.distanceMeters,
    calories: a.calories,
    avg_heart_rate_bpm: a.avgHeartRateBpm,
    max_heart_rate_bpm: a.maxHeartRateBpm,
    avg_speed_mps: a.avgSpeedMps,
    elevation_gain_m: a.elevationGainM,
    hr_zones: a.hrZones ?? null,
    raw: a.raw,
  }));

  const { error } = await supabase
    .from("garmin_activities")
    .upsert(rows, { onConflict: "user_id,garmin_activity_id" });

  if (error) throw new Error(error.message);
  return rows.length;
}

export async function upsertGarminHrSamples(
  supabase: SupabaseClient,
  userId: string,
  samples: readonly GarminHeartRateSample[],
): Promise<number> {
  if (samples.length === 0) return 0;

  const rows = samples.map((s) => ({
    user_id: userId,
    garmin_activity_id: s.garminActivityId,
    ts: s.ts,
    bpm: s.bpm,
  }));

  // Chunk to keep payloads under Supabase's request size cap.
  const CHUNK = 1000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("garmin_heart_rate_samples")
      .upsert(slice, { onConflict: "user_id,garmin_activity_id,ts" });
    if (error) throw new Error(error.message);
  }

  return rows.length;
}

export async function fetchRecentGarminActivities(
  supabase: SupabaseClient,
  userId: string,
  limit = 25,
): Promise<GarminActivity[]> {
  const { data, error } = await supabase
    .from("garmin_activities")
    .select(
      "id, user_id, garmin_activity_id, activity_type, start_time, duration_seconds, distance_meters, calories, avg_heart_rate_bpm, max_heart_rate_bpm, avg_speed_mps, elevation_gain_m, hr_zones, created_at",
    )
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapActivityRow(row as GarminActivityRow));
}

// ─── Sync logs ──────────────────────────────────────────────────────────────

export async function insertGarminSyncLog(
  supabase: SupabaseClient,
  userId: string,
  trigger: GarminSyncTrigger,
): Promise<string> {
  const { data, error } = await supabase
    .from("garmin_sync_logs")
    .insert({
      user_id: userId,
      trigger,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function finaliseGarminSyncLog(
  supabase: SupabaseClient,
  logId: string,
  patch: {
    status: GarminSyncStatus;
    activitiesSynced: number;
    samplesSynced: number;
    errorMessage?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("garmin_sync_logs")
    .update({
      finished_at: new Date().toISOString(),
      status: patch.status,
      activities_synced: patch.activitiesSynced,
      samples_synced: patch.samplesSynced,
      error_message: patch.errorMessage ?? null,
    })
    .eq("id", logId);

  if (error) throw new Error(error.message);
}

export async function fetchRecentGarminSyncLogs(
  supabase: SupabaseClient,
  userId: string,
  limit = 5,
): Promise<GarminSyncLog[]> {
  const { data, error } = await supabase
    .from("garmin_sync_logs")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapSyncLogRow(row as GarminSyncLogRow));
}
