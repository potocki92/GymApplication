import { create } from "zustand";

import { readDashboardCache, writeDashboardCache } from "@/lib/dashboard-cache";
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

/**
 * Returns the authenticated user when Supabase is configured AND signed-in,
 * otherwise null. Configured-but-no-user is treated the same as not-configured
 * so the store always has a place to put writes (IndexedDB) instead of
 * silently dropping them during auth init.
 */
function activeUser() {
  if (!isSupabaseConfigured()) return null;
  return useAuthStore.getState().user;
}

async function waitForAuthInitialization(): Promise<void> {
  if (!isSupabaseConfigured() || useAuthStore.getState().initialized) return;

  await new Promise<void>((resolve) => {
    const subscription: { unsubscribe?: () => void } = {};
    subscription.unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.initialized) return;
      subscription.unsubscribe?.();
      resolve();
    });

    if (useAuthStore.getState().initialized) {
      subscription.unsubscribe();
      resolve();
    }
  });
}

interface MetricsCache {
  records: BodyMetricRecord[];
  goal: BodyMetricGoal | null;
}

function cacheCurrentMetrics(userId: string, data: MetricsCache): void {
  writeDashboardCache("metrics", userId, data);
}

async function loadInitial(): Promise<{
  records: BodyMetricRecord[];
  goal: BodyMetricGoal | null;
}> {
  await waitForAuthInitialization();
  const user = activeUser();
  if (user) {
    const cached = readDashboardCache<MetricsCache>("metrics", user.id);
    if (cached) return cached;

    const [records, goal] = await Promise.all([
      loadMetricsFromSupabase(user.id),
      loadGoalFromSupabase(user.id),
    ]);
    const data = { records, goal };
    cacheCurrentMetrics(user.id, data);
    return data;
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
    const user = activeUser();
    if (user) {
      cacheCurrentMetrics(user.id, { records: get().records, goal: get().goal });
      await upsertMetricToSupabase(record, user.id);
    } else {
      await putMetric(record);
    }
  },

  remove: async (id) => {
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
    const user = activeUser();
    if (user) {
      cacheCurrentMetrics(user.id, { records: get().records, goal: get().goal });
      await deleteMetricFromSupabase(id, user.id);
    } else {
      await deleteMetric(id);
    }
  },

  setGoal: async (goal) => {
    set({ goal });
    const user = activeUser();
    if (user) {
      cacheCurrentMetrics(user.id, { records: get().records, goal });
      await saveGoalToSupabase(goal, user.id);
    } else {
      await saveGoal(goal);
    }
  },
}));
