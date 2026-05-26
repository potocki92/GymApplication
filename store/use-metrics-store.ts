import { create } from "zustand";

import {
  deleteMetric,
  loadAllMetrics,
  loadGoal,
  putMetric,
  saveGoal,
} from "@/lib/idb-metrics";
import type { BodyMetricGoal, BodyMetricRecord } from "@/types";

interface MetricsState {
  records: BodyMetricRecord[];
  goal: BodyMetricGoal | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  upsert: (record: BodyMetricRecord) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setGoal: (goal: BodyMetricGoal | null) => Promise<void>;
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  records: [],
  goal: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const [records, goal] = await Promise.all([loadAllMetrics(), loadGoal()]);
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
    await putMetric(record);
  },

  remove: async (id) => {
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
    await deleteMetric(id);
  },

  setGoal: async (goal) => {
    set({ goal });
    await saveGoal(goal);
  },
}));
