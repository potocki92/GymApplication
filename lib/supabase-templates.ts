import { getSupabaseClient } from "@/lib/supabase/client";
import type { WorkoutExercise, WorkoutTemplate, WorkoutType } from "@/types";

interface TemplateRow {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  exercises: WorkoutExercise[] | null;
  estimated_duration_min: number | string | null;
  usage_count: number | string | null;
  created_at: string;
}

function mapRowToTemplate(row: TemplateRow): WorkoutTemplate {
  return {
    id: row.id,
    name: row.name,
    type: (row.type ?? undefined) as WorkoutType | undefined,
    exercises: row.exercises ?? [],
    estimatedDurationMin: Number(row.estimated_duration_min ?? 0),
    usageCount: Number(row.usage_count ?? 0),
    createdAt: new Date(row.created_at).getTime(),
  };
}

function templateToRow(template: WorkoutTemplate, userId: string) {
  return {
    id: template.id,
    user_id: userId,
    name: template.name,
    type: template.type ?? null,
    exercises: template.exercises,
    estimated_duration_min: template.estimatedDurationMin,
    usage_count: template.usageCount,
    created_at: new Date(template.createdAt).toISOString(),
  };
}

function throwIfSupabaseError(error: { message?: string } | null): void {
  if (error) throw new Error(error.message ?? "Supabase write failed");
}

export async function loadTemplatesFromSupabase(
  userId: string,
): Promise<WorkoutTemplate[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as TemplateRow[]).map(mapRowToTemplate);
}

export async function upsertTemplateToSupabase(
  template: WorkoutTemplate,
  userId: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("workout_templates")
    .upsert(templateToRow(template, userId), { onConflict: "id" });
  throwIfSupabaseError(error);
}

export async function deleteTemplateFromSupabase(
  id: string,
  userId: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("workout_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  throwIfSupabaseError(error);
}
