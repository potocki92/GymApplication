import { NextResponse } from "next/server";

import { runGarminSync } from "@/lib/garmin/sync-service";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { fetchGarminIntegration } from "@/lib/supabase-garmin";

export async function POST() {
  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const integration = await fetchGarminIntegration(supabase, user.id);
  if (!integration || integration.status === "disconnected") {
    return NextResponse.json({ error: "not_connected" }, { status: 409 });
  }

  try {
    const result = await runGarminSync({
      supabase,
      userId: user.id,
      integration,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync_failed";
    const status = message === "garmin_unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
