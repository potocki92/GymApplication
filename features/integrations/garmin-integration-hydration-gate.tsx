"use client";

import { useEffect } from "react";

import { useGarminIntegrationStore } from "@/store";

/** Loads the Garmin integration snapshot once on mount. */
export function GarminIntegrationHydrationGate() {
  useEffect(() => {
    void useGarminIntegrationStore.getState().hydrate();
  }, []);
  return null;
}
