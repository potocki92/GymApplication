"use client";

import { useEffect } from "react";

import { useTemplatesStore } from "@/store";

/** Ładuje szablony treningów raz, przy montażu aplikacji. */
export function TemplatesHydrationGate() {
  useEffect(() => {
    void useTemplatesStore.getState().hydrate();
  }, []);
  return null;
}
