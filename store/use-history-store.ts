import { create } from "zustand";

import {
  appendHistory,
  clearAllHistory,
  loadAllHistory,
} from "@/lib/idb-history";
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

/**
 * Returns the authenticated user when Supabase is configured AND signed-in,
 * otherwise null. The store treats "configured but no user" the same as
 * "not configured" — falling back to IndexedDB — so a write isn't silently
 * dropped during auth init or after sign-out.
 */
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

async function activeUserAfterAuth() {
  await waitForAuthInitialization();
  return activeUser();
}

async function loadInitial(): Promise<ExerciseHistoryRecord[]> {
  const user = await activeUserAfterAuth();
  if (user) return loadHistoryFromSupabase(user.id);
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
    const user = await activeUserAfterAuth();
    if (user) await appendHistoryToSupabase(records, user.id);
    else await appendHistory(records);
  },

  clear: async () => {
    set({ records: [] });
    const user = await activeUserAfterAuth();
    if (user) await clearHistoryFromSupabase(user.id);
    else await clearAllHistory();
  },
}));
