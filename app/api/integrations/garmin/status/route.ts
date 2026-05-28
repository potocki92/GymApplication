import { NextResponse } from "next/server";

import { shouldUseMockGarmin } from "@/lib/garmin/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGarminIntegrationSafe,
  fetchRecentGarminActivities,
  fetchRecentGarminSyncLogs,
} from "@/lib/supabase-garmin";

export async function GET() {
  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [integration, recentActivities, recentLogs] = await Promise.all([
    fetchGarminIntegrationSafe(supabase, user.id),
    fetchRecentGarminActivities(supabase, user.id, 10),
    fetchRecentGarminSyncLogs(supabase, user.id, 5),
  ]);

  return NextResponse.json({
    integration,
    recentActivities,
    recentLogs,
    demoMode: shouldUseMockGarmin(),
  });
}
