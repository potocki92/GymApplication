import { NextResponse } from "next/server";

import { canAccess } from "@/lib/access-control";
import { fetchAccessUser } from "@/lib/supabase-access";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const accessUser = await fetchAccessUser(
    supabase,
    user.id,
    user.email ?? null,
  );

  return NextResponse.json({
    user: {
      id: accessUser.id,
      email: accessUser.email,
      role: accessUser.role,
      planId: accessUser.planId,
    },
    capabilities: {
      garminConnect: canAccess(accessUser, "garmin_connect"),
      manageSystem: canAccess(accessUser, "manage_system"),
      hiddenDevPanel: canAccess(accessUser, "hidden_dev_panel"),
    },
  });
}
