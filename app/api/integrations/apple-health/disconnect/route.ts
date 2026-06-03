import { NextResponse } from "next/server";

import { canUseAppleHealthIntegration } from "@/lib/apple-health/access";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { clearAppleHealthIntegration } from "@/lib/supabase-apple-health";

/** Rozłącza Apple Health i unieważnia token ingestu. */
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

  await clearAppleHealthIntegration(supabase, user.id);
  return NextResponse.json({ ok: true });
}
