import { create } from "zustand";

import {
  deleteMetric,
  loadAllMetrics,
  loadGoal,
  putMetric,
  saveGoal,
} from "@/lib/idb-metrics";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  deleteMetricFromSupabase,
  loadGoalFromSupabase,
  loadMetricsFromSupabase,
  saveGoalToSupabase,
  upsertMetricToSupabase,
} from "@/lib/supabase-metrics";
import type { BodyMetricGoal, BodyMetricRecord } from "@/types";
import { useAuthStore } from "./use-auth-store";

interface MetricsState {
  records: BodyMetricRecord[];
  goal: BodyMetricGoal | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  rehydrate: () => Promise<void>;
  upsert: (record: BodyMetricRecord) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setGoal: (goal: BodyMetricGoal | null) => Promise<void>;
}

async function loadInitial(): Promise<{
  records: BodyMetricRecord[];
  goal: BodyMetricGoal | null;
}> {
  if (isSupabaseConfigured()) {
    const user = useAuthStore.getState().user;
    if (!user) return { records: [], goal: null };
    const [records, goal] = await Promise.all([
      loadMetricsFromSupabase(user.id),
      loadGoalFromSupabase(user.id),
    ]);
    return { records, goal };
  }
  const [records, goal] = await Promise.all([loadAllMetrics(), loadGoal()]);
  return { records, goal };
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  records: [],
  goal: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const { records, goal } = await loadInitial();
    set({ records, goal, hydrated: true });
  },

  rehydrate: async () => {
    const { records, goal } = await loadInitial();
    set({ records, goal, hydrated: true });
  },

  upsert: async (record) => {
    set((s) => {
      const idx = s.records.findIndex((r) => r.id === record.id);
      const next =
        idx >= 0
          ? s.records.map((r) => (r.id === record.id ? record : r))
          : [...s.records, record];
      return { records: next };
    });
    if (isSupabaseConfigured()) {
      const user = useAuthStore.getState().user;
      if (user) await upsertMetricToSupabase(record, user.id);
    } else {
      await putMetric(record);
    }
  },

  remove: async (id) => {
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
    if (isSupabaseConfigured()) {
      const user = useAuthStore.getState().user;
      if (user) await deleteMetricFromSupabase(id, user.id);
    } else {
      await deleteMetric(id);
    }
  },

  setGoal: async (goal) => {
    set({ goal });
    if (isSupabaseConfigured()) {
      const user = useAuthStore.getState().user;
      if (user) await saveGoalToSupabase(goal, user.id);
    } else {
      await saveGoal(goal);
    }
  },
}));
