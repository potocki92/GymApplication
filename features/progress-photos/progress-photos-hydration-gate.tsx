"use client";

import { useEffect } from "react";

import { useProgressPhotosStore } from "@/store";

/** Loads progress-photo metadata from Supabase (or IndexedDB) on app mount. */
export function ProgressPhotosHydrationGate() {
  useEffect(() => {
    void useProgressPhotosStore.getState().hydrate();
  }, []);
  return null;
}
