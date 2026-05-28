import { NextResponse } from "next/server";

import { canUseGarminIntegration } from "@/lib/garmin/access";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { clearGarminIntegrationTokens } from "@/lib/supabase-garmin";

export async function POST() {
  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await canUseGarminIntegration(supabase, user))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await clearGarminIntegrationTokens(supabase, user.id);
  return NextResponse.json({ ok: true });
}
