"use client";

import { useEffect } from "react";

import { useActiveSessionStore } from "@/store";

/**
 * Minimal Supabase-backed active-session hydration. It only restores the latest
 * server snapshot into the existing active-session store; UI writes still use the
 * current local flow until the event-sourcing rollout is completed.
 */
export function ActiveWorkoutHydrationGate() {
  useEffect(() => {
    const store = useActiveSessionStore.getState();
    void store.hydrateActiveWorkoutSession();
    void store.syncOutbox();

    const handleOnline = () => {
      void useActiveSessionStore.getState().syncOutbox();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return null;
}
