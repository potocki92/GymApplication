import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { exchangeCodeForToken } from "@/lib/garmin/oauth-client";
import { getUserId } from "@/lib/garmin/api-client";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { upsertGarminIntegration } from "@/lib/supabase-garmin";

const STATE_COOKIE = "garmin_oauth_state";
const VERIFIER_COOKIE = "garmin_oauth_verifier";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/integrations?error=supabase`);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(VERIFIER_COOKIE)?.value;

  // Always clear the OAuth scratch cookies before returning, success or fail.
  const clear = () => {
    cookieStore.delete(STATE_COOKIE);
    cookieStore.delete(VERIFIER_COOKIE);
  };

  if (error) {
    clear();
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state || !expectedState || !codeVerifier || state !== expectedState) {
    clear();
    return NextResponse.redirect(`${origin}/integrations?error=state`);
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    clear();
    return NextResponse.redirect(`${origin}/login?next=/integrations`);
  }

  try {
    const tokens = await exchangeCodeForToken({ code, codeVerifier });
    let externalUserId: string | null = null;
    try {
      externalUserId = await getUserId(tokens.accessToken);
    } catch {
      // Non-fatal: connection succeeded, we just don't have the Garmin user id.
    }

    await upsertGarminIntegration(supabase, user.id, {
      status: "connected",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
      scope: tokens.scope,
      externalUserId,
      connectedAt: new Date().toISOString(),
      lastError: null,
    });

    clear();
    return NextResponse.redirect(`${origin}/integrations?connected=garmin`);
  } catch (err) {
    clear();
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(
      `${origin}/integrations?error=${encodeURIComponent(message.split(":")[0])}`,
    );
  }
}
