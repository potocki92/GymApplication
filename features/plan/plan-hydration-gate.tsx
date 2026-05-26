"use client";

import { useEffect } from "react";

import { usePlanStore } from "@/store";

/**
 * Mounted in the `(app)` layout. Triggers the plan store's idempotent first
 * load — Supabase when configured + authed, in-memory seed otherwise.
 */
export function PlanHydrationGate() {
  useEffect(() => {
    void usePlanStore.getState().hydrate();
  }, []);
  return null;
}
