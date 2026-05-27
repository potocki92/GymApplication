"use client";

import { useEffect } from "react";

import { useSessionHistoryStore } from "@/store";

/** Loads session-history records (one per completed workout) on app mount. */
export function SessionHistoryHydrationGate() {
  useEffect(() => {
    void useSessionHistoryStore.getState().hydrate();
  }, []);
  return null;
}
