import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Per-request Supabase client for use in server components, server actions, and
 * route handlers. Creates a fresh instance each call because `cookies()` must be
 * awaited within the active request scope. Returns null when Supabase isn't
 * configured.
 */
export async function getServerSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `set` only works inside server actions / route handlers; ignore for
          // pure read paths (Server Components) where Next forbids mutation.
        }
      },
    },
  });
}
