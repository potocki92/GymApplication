/**
 * Shared Supabase config. Centralised so we never read `process.env.*` from more
 * than one place, and so `isSupabaseConfigured()` returns the same answer to
 * every consumer (stores, middleware, UI gates).
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
