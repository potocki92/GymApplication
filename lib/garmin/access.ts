import type { SupabaseClient, User } from "@supabase/supabase-js";

import { canAccess } from "@/lib/access-control";
import { fetchAccessUser } from "@/lib/supabase-access";

export async function canUseGarminIntegration(
  supabase: SupabaseClient,
  user: User,
): Promise<boolean> {
  const accessUser = await fetchAccessUser(
    supabase,
    user.id,
    user.email ?? null,
  );
  return canAccess(accessUser, "garmin_connect");
}
