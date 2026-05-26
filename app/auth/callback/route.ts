import { NextResponse, type NextRequest } from "next/server";

import { getServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Email-confirmation / OAuth callback. Supabase appends a one-time `code` to the
 * redirect URL; we exchange it for a session (writes the auth cookies) and bounce
 * to `next` (default: home).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await getServerSupabaseClient();
    if (supabase) await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
