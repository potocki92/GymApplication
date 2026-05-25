/**
 * Supabase integration seam.
 *
 * The app currently runs on in-memory mock data (see `data/` + `store/`).
 * When wiring Supabase later:
 *   1. `npm install @supabase/supabase-js`
 *   2. set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   3. instantiate and return the client below
 *   4. replace the seed logic in the Zustand stores with async fetches
 *      that map rows to the types in `types/`.
 */

export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
}
