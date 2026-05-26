import { create } from "zustand";

import { appendHistory, clearAllHistory, loadAllHistory } from "@/lib/idb-history";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  appendHistoryToSupabase,
  clearHistoryFromSupabase,
  loadHistoryFromSupabase,
} from "@/lib/supabase-history";
import type { ExerciseHistoryRecord } from "@/types";
import { useAuthStore } from "./use-auth-store";

interface HistoryState {
  records: ExerciseHistoryRecord[];
  hydrated: boolean;
  /** Idempotent first-load; routes to Supabase (when authed) or IndexedDB. */
  hydrate: () => Promise<void>;
  /** Force a fresh load — called by the auth gate when the user identity changes. */
  rehydrate: () => Promise<void>;
  appendMany: (records: ExerciseHistoryRecord[]) => Promise<void>;
  clear: () => Promise<void>;
}

async function loadInitial(): Promise<ExerciseHistoryRecord[]> {
  if (isSupabaseConfigured()) {
    const user = useAuthStore.getState().user;
    if (!user) return [];
    return loadHistoryFromSupabase(user.id);
  }
  return loadAllHistory();
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  records: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const records = await loadInitial();
    set({ records, hydrated: true });
  },

  rehydrate: async () => {
    const records = await loadInitial();
    set({ records, hydrated: true });
  },

  appendMany: async (records) => {
    if (records.length === 0) return;
    set((s) => ({ records: [...s.records, ...records] }));
    if (isSupabaseConfigured()) {
      const user = useAuthStore.getState().user;
      if (user) await appendHistoryToSupabase(records, user.id);
    } else {
      await appendHistory(records);
    }
  },

  clear: async () => {
    set({ records: [] });
    if (isSupabaseConfigured()) {
      const user = useAuthStore.getState().user;
      if (user) await clearHistoryFromSupabase(user.id);
    } else {
      await clearAllHistory();
    }
  },
}));
