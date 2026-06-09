import { create } from "zustand";

import {
  deleteTemplate,
  loadAllTemplates,
  putTemplate,
} from "@/lib/idb-templates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  deleteTemplateFromSupabase,
  loadTemplatesFromSupabase,
  upsertTemplateToSupabase,
} from "@/lib/supabase-templates";
import { workoutToTemplate } from "@/lib/template-utils";
import type { Workout, WorkoutTemplate } from "@/types";
import { useAuthStore } from "./use-auth-store";

interface TemplatesState {
  templates: WorkoutTemplate[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  rehydrate: () => Promise<void>;
  /** Zapisuje istniejący trening jako nowy szablon. */
  saveFromWorkout: (workout: Workout) => Promise<void>;
  remove: (id: string) => Promise<void>;
  incrementUsage: (id: string) => Promise<void>;
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

async function loadInitial(): Promise<WorkoutTemplate[]> {
  await waitForAuthInitialization();
  const user = activeUser();
  if (user) return loadTemplatesFromSupabase(user.id);
  return loadAllTemplates();
}

async function persist(template: WorkoutTemplate): Promise<void> {
  const user = activeUser();
  if (user) await upsertTemplateToSupabase(template, user.id);
  else await putTemplate(template);
}

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  templates: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const templates = await loadInitial();
    set({ templates, hydrated: true });
  },

  rehydrate: async () => {
    const templates = await loadInitial();
    set({ templates, hydrated: true });
  },

  saveFromWorkout: async (workout) => {
    const template = workoutToTemplate(workout);
    set((s) => ({ templates: [template, ...s.templates] }));
    await persist(template);
  },

  remove: async (id) => {
    set((s) => ({ templates: s.templates.filter((tpl) => tpl.id !== id) }));
    const user = activeUser();
    if (user) await deleteTemplateFromSupabase(id, user.id);
    else await deleteTemplate(id);
  },

  incrementUsage: async (id) => {
    const current = get().templates.find((tpl) => tpl.id === id);
    if (!current) return;
    const updated: WorkoutTemplate = {
      ...current,
      usageCount: current.usageCount + 1,
    };
    set((s) => ({
      templates: s.templates.map((tpl) => (tpl.id === id ? updated : tpl)),
    }));
    await persist(updated);
  },
}));
