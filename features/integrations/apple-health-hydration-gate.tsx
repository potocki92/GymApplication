"use client";

import { useEffect } from "react";

import { useAppleHealthIntegrationStore } from "@/store";

/** Loads the Apple Health integration snapshot once on mount. */
export function AppleHealthHydrationGate() {
  useEffect(() => {
    void useAppleHealthIntegrationStore.getState().hydrate();
  }, []);
  return null;
}
