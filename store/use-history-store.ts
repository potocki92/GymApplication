import { create } from "zustand";

import { appendHistory, clearAllHistory, loadAllHistory } from "@/lib/idb-history";
import type { ExerciseHistoryRecord } from "@/types";

interface HistoryState {
  records: ExerciseHistoryRecord[];
  hydrated: boolean;
  /** Idempotent — loads records from IndexedDB the first time it's called. */
  hydrate: () => Promise<void>;
  /** Append in memory and persist to IndexedDB. */
  appendMany: (records: ExerciseHistoryRecord[]) => Promise<void>;
  clear: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  records: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const records = await loadAllHistory();
    set({ records, hydrated: true });
  },

  appendMany: async (records) => {
    if (records.length === 0) return;
    set((s) => ({ records: [...s.records, ...records] }));
    await appendHistory(records);
  },

  clear: async () => {
    set({ records: [] });
    await clearAllHistory();
  },
}));
