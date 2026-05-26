import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

const AUTH_ROUTES = new Set(["/login", "/signup"]);
const PUBLIC_PREFIXES = ["/auth/"]; // OAuth callback etc.

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

  return response;
}
