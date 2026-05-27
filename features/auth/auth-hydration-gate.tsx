"use client";

import { useEffect } from "react";

import { getSupabaseClient } from "@/lib/supabase/client";
import {
  useAuthStore,
  useHistoryStore,
  useMetricsStore,
  usePlanStore,
  useProfileStore,
} from "@/store";

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
    } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION fires on mount and would race the getUser() above —
      // skip it so we don't double-fetch user data.
      if (event === "INITIAL_SESSION") return;

      const prevUserId = useAuthStore.getState().user?.id ?? null;
      const nextUserId = session?.user?.id ?? null;
      useAuthStore.getState().setUser(session?.user ?? null);
      if (prevUserId === nextUserId) return;

      // Identity changed (sign-in, sign-out, account switch) — re-pull each
      // store but only if it already finished its initial load. Stores that
      // are mid-hydrate will pick up the new user themselves once hydrate()
      // resolves.
      if (useHistoryStore.getState().hydrated) {
        void useHistoryStore.getState().rehydrate?.();
      }
      if (useMetricsStore.getState().hydrated) {
        void useMetricsStore.getState().rehydrate?.();
      }
      if (usePlanStore.getState().hydrated) {
        void usePlanStore.getState().rehydrate?.();
      }
      if (useProfileStore.getState().hydrated) {
        void useProfileStore.getState().rehydrate();
      } else if (nextUserId) {
        void useProfileStore.getState().hydrate();
      } else {
        useProfileStore.getState().reset();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
