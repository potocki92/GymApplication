import { NextResponse } from "next/server";

import { canUseAppleHealthIntegration } from "@/lib/apple-health/access";
import { generateIngestToken } from "@/lib/apple-health/token";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { upsertAppleHealthIntegration } from "@/lib/supabase-apple-health";

/**
 * Generuje (lub regeneruje) token ingestu Apple Health dla zalogowanego użytkownika.
 * Token trafia do `user_integrations.access_token` i jest zwracany właścicielowi,
 * aby mógł go wkleić do iOS Skrótu. Regeneracja unieważnia poprzedni token.
 */
export async function POST() {
  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await canUseAppleHealthIntegration(supabase, user))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = generateIngestToken();
  const integration = await upsertAppleHealthIntegration(supabase, user.id, {
    status: "connected",
    token,
    connectedAt: new Date().toISOString(),
    lastError: null,
  });

  return NextResponse.json({ integration });
}
