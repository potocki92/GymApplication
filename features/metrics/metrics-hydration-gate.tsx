"use client";

import { useEffect } from "react";

import { useMetricsStore } from "@/store";

/** Loads body-metric records and goal from IndexedDB once, on app mount. */
export function MetricsHydrationGate() {
  useEffect(() => {
    void useMetricsStore.getState().hydrate();
  }, []);
  return null;
}
