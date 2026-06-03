import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AppleHealthIngestLog,
  AppleHealthIngestStatus,
  AppleHealthIntegration,
  AppleHealthMetric,
  AppleHealthSample,
  AppleHealthSampleInput,
} from "@/types";
import type { IntegrationStatus } from "@/types/garmin";

const PROVIDER = "apple_health" as const;

// ─── Row shapes ─────────────────────────────────────────────────────────────

interface UserIntegrationRow {
  id: string;
  status: string;
  access_token: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
}

interface SampleRow {
  id: string;
  metric: string;
  value: number | string;
  unit: string | null;
  start_time: string;
  end_time: string | null;
  source: string;
}

interface IngestLogRow {
  id: string;
  received_at: string;
  status: string;
  samples_ingested: number;
  error_message: string | null;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function asStatus(v: string): IntegrationStatus {
  return v === "connected" || v === "disconnected" || v === "error" || v === "expired"
    ? v
    : "disconnected";
}

function asMetric(v: string): AppleHealthMetric {
  return v === "steps" ||
    v === "active_energy_kcal" ||
    v === "resting_heart_rate" ||
    v === "avg_heart_rate"
    ? v
    : "steps";
}

function asIngestStatus(v: string): AppleHealthIngestStatus {
  return v === "success" || v === "partial" || v === "error" ? v : "success";
}

function mapIntegrationRow(row: UserIntegrationRow): AppleHealthIntegration {
  return {
    id: row.id,
    status: asStatus(row.status),
    token: row.access_token,
    connectedAt: row.connected_at,
    lastSyncAt: row.last_sync_at,
    lastError: row.last_error,
  };
}

function mapSampleRow(row: SampleRow): AppleHealthSample {
  return {
    id: row.id,
    metric: asMetric(row.metric),
    value: Number(row.value),
    unit: row.unit,
    startTime: row.start_time,
    endTime: row.end_time,
    source: row.source,
  };
}

function mapIngestLogRow(row: IngestLogRow): AppleHealthIngestLog {
  return {
    id: row.id,
    receivedAt: row.received_at,
    status: asIngestStatus(row.status),
    samplesIngested: row.samples_ingested,
    errorMessage: row.error_message,
  };
}

/** Mapuje znormalizowane próbki na wiersze (snake_case) dla RPC `ingest_apple_health`. */
export function toIngestRows(
  samples: readonly AppleHealthSampleInput[],
): Record<string, unknown>[] {
  return samples.map((s) => ({
    metric: s.metric,
    value: s.value,
    unit: s.unit,
    start_time: s.startTime,
    end_time: s.endTime,
    source: s.source,
    raw: s,
  }));
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export async function fetchAppleHealthIntegration(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppleHealthIntegration | null> {
  const { data, error } = await supabase
    .from("user_integrations")
    .select("id, status, access_token, connected_at, last_sync_at, last_error")
    .eq("user_id", userId)
    .eq("provider", PROVIDER)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapIntegrationRow(data as UserIntegrationRow);
}

export interface AppleHealthIntegrationPatch {
  status?: IntegrationStatus;
  token?: string | null;
  connectedAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
}

export async function upsertAppleHealthIntegration(
  supabase: SupabaseClient,
  userId: string,
  patch: AppleHealthIntegrationPatch,
): Promise<AppleHealthIntegration> {
  const row: Record<string, unknown> = {
    user_id: userId,
    provider: PROVIDER,
    updated_at: new Date().toISOString(),
  };
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.token !== undefined) row.access_token = patch.token;
  if (patch.connectedAt !== undefined) row.connected_at = patch.connectedAt;
  if (patch.lastSyncAt !== undefined) row.last_sync_at = patch.lastSyncAt;
  if (patch.lastError !== undefined) row.last_error = patch.lastError;

  const { data, error } = await supabase
    .from("user_integrations")
    .upsert(row, { onConflict: "user_id,provider" })
    .select("id, status, access_token, connected_at, last_sync_at, last_error")
    .single();

  if (error) throw new Error(error.message);
  return mapIntegrationRow(data as UserIntegrationRow);
}

export async function clearAppleHealthIntegration(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await upsertAppleHealthIntegration(supabase, userId, {
    status: "disconnected",
    token: null,
  });
}

export async function fetchRecentAppleHealthSamples(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<AppleHealthSample[]> {
  const { data, error } = await supabase
    .from("apple_health_samples")
    .select("id, metric, value, unit, start_time, end_time, source")
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapSampleRow(row as SampleRow));
}

export async function fetchRecentAppleHealthIngestLogs(
  supabase: SupabaseClient,
  userId: string,
  limit = 5,
): Promise<AppleHealthIngestLog[]> {
  const { data, error } = await supabase
    .from("apple_health_ingest_logs")
    .select("id, received_at, status, samples_ingested, error_message")
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapIngestLogRow(row as IngestLogRow));
}
