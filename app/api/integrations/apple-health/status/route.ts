import { NextResponse, type NextRequest } from "next/server";

import { canUseAppleHealthIntegration } from "@/lib/apple-health/access";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchAppleHealthIntegration,
  fetchRecentAppleHealthIngestLogs,
  fetchRecentAppleHealthSamples,
} from "@/lib/supabase-apple-health";

export async function GET(request: NextRequest) {
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

  const [integration, recentSamples, recentLogs] = await Promise.all([
    fetchAppleHealthIntegration(supabase, user.id),
    fetchRecentAppleHealthSamples(supabase, user.id, 20),
    fetchRecentAppleHealthIngestLogs(supabase, user.id, 5),
  ]);

  const ingestUrl = `${new URL(request.url).origin}/api/integrations/apple-health/ingest`;

  return NextResponse.json({
    integration,
    recentSamples,
    recentLogs,
    ingestUrl,
    available: true,
  });
}
