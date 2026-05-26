import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";
import type { BodyMetricGoal, BodyMetricRecord } from "@/types";

interface MetricRow {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | string;
  chest_cm: number | string | null;
  waist_cm: number | string | null;
  hips_cm: number | string | null;
  body_fat_pct: number | string | null;
  notes: string | null;
  updated_at: string;
}

interface GoalRow {
  user_id: string;
  metric: string;
  start_kg: number | string;
  target_kg: number | string;
  updated_at: string;
}

function num(v: number | string | null | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function mapRowToMetric(row: MetricRow): BodyMetricRecord {
  return {
    id: row.id,
    date: row.date,
    weightKg: Number(row.weight_kg),
    chestCm: num(row.chest_cm),
    waistCm: num(row.waist_cm),
    hipsCm: num(row.hips_cm),
    bodyFatPct: num(row.body_fat_pct),
    notes: row.notes ?? undefined,
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export function metricToRow(
  r: BodyMetricRecord,
  userId: string,
): {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  body_fat_pct: number | null;
  notes: string | null;
  updated_at: string;
} {
  return {
    id: r.id,
    user_id: userId,
    date: r.date,
    weight_kg: r.weightKg,
    chest_cm: r.chestCm ?? null,
    waist_cm: r.waistCm ?? null,
    hips_cm: r.hipsCm ?? null,
    body_fat_pct: r.bodyFatPct ?? null,
    notes: r.notes ?? null,
    updated_at: new Date(r.updatedAt).toISOString(),
  };
}

function getClient(): SupabaseClient | null {
  return getSupabaseClient();
}

export async function loadMetricsFromSupabase(
  userId: string,
): Promise<BodyMetricRecord[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error || !data) return [];
  return (data as MetricRow[]).map(mapRowToMetric);
}

export async function upsertMetricToSupabase(
  record: BodyMetricRecord,
  userId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  await supabase
    .from("body_metrics")
    .upsert(metricToRow(record, userId), { onConflict: "id" });
}

export async function deleteMetricFromSupabase(
  id: string,
  userId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  await supabase.from("body_metrics").delete().eq("id", id).eq("user_id", userId);
}

export async function loadGoalFromSupabase(
  userId: string,
): Promise<BodyMetricGoal | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("body_metric_goals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as GoalRow;
  return {
    metric: "weightKg",
    startKg: Number(row.start_kg),
    targetKg: Number(row.target_kg),
  };
}

export async function saveGoalToSupabase(
  goal: BodyMetricGoal | null,
  userId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  if (goal == null) {
    await supabase.from("body_metric_goals").delete().eq("user_id", userId);
    return;
  }
  await supabase
    .from("body_metric_goals")
    .upsert(
      {
        user_id: userId,
        metric: goal.metric,
        start_kg: goal.startKg,
        target_kg: goal.targetKg,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
}
