import { getSupabaseClient } from "@/lib/supabase/client";
import type { Goal, GoalType } from "@/types";
import { GOAL_TYPES } from "@/types";

interface GoalRow {
  id: string;
  user_id: string;
  type: string;
  target: number | string;
  created_at: string;
}

function asGoalType(v: string): GoalType | null {
  return (GOAL_TYPES as readonly string[]).includes(v) ? (v as GoalType) : null;
}

function mapRowToGoal(row: GoalRow): Goal | null {
  const type = asGoalType(row.type);
  if (!type) return null;
  return {
    id: row.id,
    type,
    target: Number(row.target),
    createdAt: new Date(row.created_at).getTime(),
  };
}

function goalToRow(goal: Goal, userId: string) {
  return {
    id: goal.id,
    user_id: userId,
    type: goal.type,
    target: goal.target,
    created_at: new Date(goal.createdAt).toISOString(),
  };
}

function throwIfSupabaseError(error: { message?: string } | null): void {
  if (error) throw new Error(error.message ?? "Supabase write failed");
}

export async function loadGoalsFromSupabase(userId: string): Promise<Goal[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as GoalRow[]).map(mapRowToGoal).filter((g): g is Goal => g !== null);
}

export async function upsertGoalToSupabase(goal: Goal, userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("user_goals")
    .upsert(goalToRow(goal, userId), { onConflict: "user_id,type" });
  throwIfSupabaseError(error);
}

export async function deleteGoalFromSupabase(id: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("user_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  throwIfSupabaseError(error);
}
