import { create } from "zustand";

import { deleteGoal, loadAllGoals, putGoal } from "@/lib/idb-goals";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  deleteGoalFromSupabase,
  loadGoalsFromSupabase,
  upsertGoalToSupabase,
} from "@/lib/supabase-goals";
import type { Goal, GoalType } from "@/types";
import { useAuthStore } from "./use-auth-store";

interface GoalsState {
  goals: Goal[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  rehydrate: () => Promise<void>;
  /** Tworzy lub aktualizuje cel danego typu (jeden cel na typ). */
  upsert: (input: { type: GoalType; target: number }) => Promise<void>;
  remove: (id: string) => Promise<void>;
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

async function loadInitial(): Promise<Goal[]> {
  await waitForAuthInitialization();
  const user = activeUser();
  if (user) return loadGoalsFromSupabase(user.id);
  return loadAllGoals();
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const goals = await loadInitial();
    set({ goals, hydrated: true });
  },

  rehydrate: async () => {
    const goals = await loadInitial();
    set({ goals, hydrated: true });
  },

  upsert: async ({ type, target }) => {
    const existing = get().goals.find((g) => g.type === type);
    const goal: Goal = existing
      ? { ...existing, target }
      : { id: uid(), type, target, createdAt: Date.now() };

    set((s) => {
      const idx = s.goals.findIndex((g) => g.type === type);
      const next =
        idx >= 0 ? s.goals.map((g) => (g.type === type ? goal : g)) : [...s.goals, goal];
      return { goals: next };
    });

    const user = activeUser();
    if (user) await upsertGoalToSupabase(goal, user.id);
    else await putGoal(goal);
  },

  remove: async (id) => {
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
    const user = activeUser();
    if (user) await deleteGoalFromSupabase(id, user.id);
    else await deleteGoal(id);
  },
}));
