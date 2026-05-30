"use client";

import { useEffect } from "react";

import { workoutSessionRealtimeManager } from "@/lib/workout-session-realtime";
import { useActiveSessionStore } from "@/store";

/**
 * Minimal Supabase-backed active-session hydration. It only restores the latest
 * server snapshot into the existing active-session store; UI writes still use the
 * current local flow until the event-sourcing rollout is completed.
 */
export function ActiveWorkoutHydrationGate() {
  useEffect(() => {
    const store = useActiveSessionStore.getState();
    void store.hydrateActiveWorkoutSession().then(() => {
      workoutSessionRealtimeManager.notifyHydrationReady();
    });
    void store.syncOutbox();

    const unsubscribeStore = useActiveSessionStore.subscribe((state, previousState) => {
      workoutSessionRealtimeManager.ensure(state.session?.id ?? null);
      if (
        state.hydrationStatus === "ready" &&
        previousState.hydrationStatus !== "ready"
      ) {
        workoutSessionRealtimeManager.notifyHydrationReady();
      }
    });
    workoutSessionRealtimeManager.ensure(store.session?.id ?? null);

    const handleRecoverySignal = () => {
      void useActiveSessionStore.getState().syncOutbox();
      workoutSessionRealtimeManager.notifyWakeOrOnline();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleRecoverySignal();
    };

    window.addEventListener("online", handleRecoverySignal);
    window.addEventListener("focus", handleRecoverySignal);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      unsubscribeStore();
      window.removeEventListener("online", handleRecoverySignal);
      window.removeEventListener("focus", handleRecoverySignal);
      document.removeEventListener("visibilitychange", handleVisibility);
      void workoutSessionRealtimeManager.stop();
    };
  }, []);

  return null;
}
