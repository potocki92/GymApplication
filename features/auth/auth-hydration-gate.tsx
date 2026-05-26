"use client";

import { useEffect } from "react";

import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore, useHistoryStore, useMetricsStore } from "@/store";

/**
 * Reads the current Supabase user once on mount, subscribes to auth state
 * changes, and re-hydrates the user-data stores whenever the signed-in identity
 * changes. Runs only in the protected `(app)` layout where data stores live; auth
 * pages don't need it. Silent no-op when Supabase isn't configured (the app
 * already runs fully on local IndexedDB in that case).
 */
export function AuthHydrationGate() {
  useEffect(() => {
    const supabase = getSupabaseClient();
    const auth = useAuthStore.getState();

    if (!supabase) {
      auth.setInitialized();
      return;
    }

    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      auth.setUser(data.user);
      auth.setInitialized();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const prevUserId = useAuthStore.getState().user?.id ?? null;
      const nextUserId = session?.user?.id ?? null;
      useAuthStore.getState().setUser(session?.user ?? null);
      if (prevUserId !== nextUserId) {
        // Identity changed (sign-in, sign-out, or account switch) — pull fresh
        // server data into the local Zustand caches.
        void useHistoryStore.getState().rehydrate?.();
        void useMetricsStore.getState().rehydrate?.();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
