"use client";

import { useEffect } from "react";

import { useGoalsStore } from "@/store";

/** Ładuje cele użytkownika raz, przy montażu aplikacji. */
export function GoalsHydrationGate() {
  useEffect(() => {
    void useGoalsStore.getState().hydrate();
  }, []);
  return null;
}
