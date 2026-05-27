"use client";

import { useEffect } from "react";

import { useProfileStore } from "@/store";

/** Loads the user profile from Supabase once on app mount. Re-hydration on
 *  identity change is handled inside AuthHydrationGate. */
export function ProfileHydrationGate() {
  useEffect(() => {
    void useProfileStore.getState().hydrate();
  }, []);
  return null;
}
