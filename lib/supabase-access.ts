import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AppAccessUser,
  FeatureKey,
  SubscriptionPlanId,
  UserFeatureGrant,
  UserRole,
} from "@/types";

interface AccessUserRow {
  id: string;
  email: string | null;
  role: string | null;
}

interface SubscriptionRow {
  plan_id: string | null;
  status: string | null;
}

interface UserFeatureRow {
  feature_key: string;
  enabled: boolean | null;
  reason: string | null;
  expires_at: string | null;
}

const ROLES = ["user", "trainer", "gym_owner", "admin", "dev"] as const;
const PLANS = ["free", "basic", "pro", "premium", "trainer", "gym", "developer"] as const;

function asRole(value: string | null | undefined): UserRole {
  return ROLES.includes(value as UserRole) ? (value as UserRole) : "user";
}

function asPlan(value: string | null | undefined): SubscriptionPlanId {
  return PLANS.includes(value as SubscriptionPlanId)
    ? (value as SubscriptionPlanId)
    : "free";
}

function asFeatureGrant(userId: string, row: UserFeatureRow): UserFeatureGrant | null {
  if (!row.feature_key) return null;
  return {
    userId,
    feature: row.feature_key as FeatureKey,
    enabled: row.enabled ?? false,
    reason: row.reason ?? undefined,
    expiresAt: row.expires_at,
  };
}

/**
 * Loads the configurable access subject for API authorization. Missing rows fall
 * back to a safe `user/free` profile so new accounts have basic app access but
 * no hidden or experimental capabilities.
 */
export async function fetchAccessUser(
  supabase: SupabaseClient,
  userId: string,
  email: string | null = null,
): Promise<AppAccessUser> {
  const [{ data: userRow }, { data: subscriptionRows }, { data: featureRows }] =
    await Promise.all([
      supabase.from("users").select("id,email,role").eq("id", userId).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("plan_id,status")
        .eq("user_id", userId)
        .in("status", ["trialing", "active"])
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("user_features").select("feature_key,enabled,reason,expires_at").eq("user_id", userId),
    ]);

  const typedUserRow = userRow as AccessUserRow | null;
  const activeSubscription = (subscriptionRows as SubscriptionRow[] | null)?.[0];
  const grants = ((featureRows as UserFeatureRow[] | null) ?? [])
    .map((row) => asFeatureGrant(userId, row))
    .filter((grant): grant is UserFeatureGrant => grant !== null);

  return {
    id: userId,
    email: typedUserRow?.email ?? email,
    role: asRole(typedUserRow?.role),
    planId: asPlan(activeSubscription?.plan_id),
    featureGrants: grants,
  };
}
