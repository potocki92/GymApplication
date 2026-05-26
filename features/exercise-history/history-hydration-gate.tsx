"use client";

import { useEffect } from "react";

import { useHistoryStore } from "@/store";

/**
 * Loads the exercise history once on app mount. Renders nothing — its sole job is
 * to trigger the IndexedDB read so PR/history consumers don't have to.
 */
export function HistoryHydrationGate() {
  useEffect(() => {
    void useHistoryStore.getState().hydrate();
  }, []);
  return null;
}
