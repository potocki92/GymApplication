import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { shouldUseMockGarmin } from "@/lib/garmin/config";
import {
  buildAuthorizeUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/garmin/oauth-client";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { upsertGarminIntegration } from "@/lib/supabase-garmin";

const STATE_COOKIE = "garmin_oauth_state";
const VERIFIER_COOKIE = "garmin_oauth_verifier";
const COOKIE_TTL_SEC = 600;

/**
 * Initiates the Garmin OAuth 2.0 PKCE handshake.
 *
 * Flow: generate code_verifier + state, stash both in httpOnly cookies, then
 * redirect the browser to Garmin. The callback route verifies the cookie
 * against the returned `state` to defeat CSRF and consumes the verifier when
 * exchanging the code.
 *
 * In demo mode (no Garmin secrets configured) we short-circuit to a synthetic
 * "connected" state so the UI flow stays reviewable.
 */
export async function GET(request: NextRequest) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { origin } = new URL(request.url);

  if (shouldUseMockGarmin()) {
    await upsertGarminIntegration(supabase, user.id, {
      status: "connected",
      externalUserId: "mock-garmin-user",
      connectedAt: new Date().toISOString(),
      lastError: null,
    });
    return NextResponse.redirect(
      `${origin}/integrations?connected=garmin&mode=demo`,
    );
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_TTL_SEC,
    path: "/api/integrations/garmin",
  });
  cookieStore.set(VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_TTL_SEC,
    path: "/api/integrations/garmin",
  });

  const authorizeUrl = buildAuthorizeUrl({ state, codeChallenge });
  return NextResponse.redirect(authorizeUrl);
}
