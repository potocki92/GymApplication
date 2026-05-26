"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Browser-side Supabase client. Cached as a module-level singleton so every
 * subscription / hook in the page shares the same auth listener and the same
 * session-token cookie writer. Returns `null` when Supabase isn't configured —
 * callers fall back to local-only IndexedDB in that case.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;
  cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}

export { isSupabaseConfigured } from "./config";
