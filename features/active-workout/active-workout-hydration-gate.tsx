"use client";

import { useEffect } from "react";

import { useActiveSessionStore, useAuthStore } from "@/store";

/**
 * Minimal Supabase-backed active-session hydration. It only restores the latest
 * server snapshot into the existing active-session store; UI writes still use the
 * current local flow until the event-sourcing rollout is completed.
 */
export function ActiveWorkoutHydrationGate() {
  const authInitialized = useAuthStore((s) => s.initialized);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  useEffect(() => {
    if (!authInitialized) return;
    void useActiveSessionStore.getState().hydrateActiveWorkoutSession();
  }, [authInitialized, userId]);

  return null;
}
