"use client";

import { useEffect } from "react";

import { useStepsStore } from "@/store";

/** Ładuje dzienne kroki (Apple Health) raz, przy montażu aplikacji. */
export function StepsHydrationGate() {
  useEffect(() => {
    void useStepsStore.getState().hydrate();
  }, []);
  return null;
}
