import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

const AUTH_ROUTES = new Set(["/login", "/signup"]);
const PUBLIC_PREFIXES = [
  "/auth/", // OAuth callback etc.
  // Apple Health ingest from iOS Skróty: no Supabase session cookie — the route
  // authenticates the request with a per-user bearer token instead.
  "/api/integrations/apple-health/ingest",
];
const ONBOARDING_PATH = "/onboarding";
/** Paths skipped by the onboarding gate even when the user is signed in. */
const ONBOARDING_EXEMPT_PREFIXES = [
  "/onboarding",
  "/auth/",
  "/api/",
  "/_next/",
];

/**
 * Runs on every request: refreshes the Supabase session, rewrites cookies, and
 * gates `(app)` routes to authenticated users. When Supabase isn't configured
 * the app degrades to fully-local mode and middleware is a no-op.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfigured()) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: getUser() refreshes the session and validates the JWT.
  // The refreshed-token cookies are written to `response` via setAll above;
  // any redirect we return must carry those cookies forward or the next
  // request will look unauthenticated and the redirect will loop.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = AUTH_ROUTES.has(pathname);
  const isPublic =
    isAuthRoute || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  function redirectKeepingSession(url: URL): NextResponse {
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return redirectKeepingSession(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectKeepingSession(url);
  }

  if (user) {
    const isExemptForOnboarding = ONBOARDING_EXEMPT_PREFIXES.some((p) =>
      pathname.startsWith(p),
    );
    // A single lightweight column read keyed on the row's PK is RLS-protected
    // and indexed — fast enough to run per request.
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();

    const onboarded = Boolean(profile?.onboarding_completed_at);

    if (!onboarded && !isExemptForOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      url.search = "";
      return redirectKeepingSession(url);
    }

    if (onboarded && pathname === ONBOARDING_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return redirectKeepingSession(url);
    }
  }

  return response;
}
