import { create } from "zustand";

import { buildDailySteps } from "@/lib/steps-utils";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchAppleHealthSteps } from "@/lib/supabase-apple-health";
import type { DailyStepsPoint } from "@/types";
import { useAuthStore } from "./use-auth-store";

/** Okno danych ładowane do pamięci (dni). Pokrywa wykres i cele krokowe. */
export const STEPS_WINDOW_DAYS = 90;

interface StepsState {
  daily: DailyStepsPoint[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

function activeUser() {
  if (!isSupabaseConfigured()) return null;
  return useAuthStore.getState().user;
}

async function waitForAuthInitialization(): Promise<void> {
  if (!isSupabaseConfigured() || useAuthStore.getState().initialized) return;

  await new Promise<void>((resolve) => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.initialized) return;
      unsubscribe();
      resolve();
    });
  });
}

/**
 * Ładuje dzienne kroki. Źródłem v1 jest Apple Health (RLS przypięte do
 * właściciela). Bez zalogowanego użytkownika / bez Supabase zwracamy pustą
 * serię — UI pokazuje wtedy zachętę do połączenia integracji.
 */
async function loadDaily(): Promise<DailyStepsPoint[]> {
  await waitForAuthInitialization();
  const user = activeUser();
  if (!user) return [];

  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const samples = await fetchAppleHealthSteps(supabase, user.id, STEPS_WINDOW_DAYS);
    return buildDailySteps(samples, STEPS_WINDOW_DAYS);
  } catch {
    return [];
  }
}

export const useStepsStore = create<StepsState>((set, get) => ({
  daily: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const daily = await loadDaily();
    set({ daily, hydrated: true });
  },

  rehydrate: async () => {
    const daily = await loadDaily();
    set({ daily, hydrated: true });
  },
}));
