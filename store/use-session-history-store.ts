import { create } from "zustand";

import {
  clearAllSessions,
  deleteSession,
  loadAllSessions,
  putSession,
} from "@/lib/idb-sessions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  deleteSessionFromSupabase,
  loadSessionsFromSupabase,
  upsertSessionToSupabase,
} from "@/lib/supabase-sessions";
import type { SessionHistoryRecord } from "@/types";
import { useAuthStore } from "./use-auth-store";

interface SessionHistoryState {
  sessions: SessionHistoryRecord[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  rehydrate: () => Promise<void>;
  upsert: (record: SessionHistoryRecord) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

function activeUser() {
  if (!isSupabaseConfigured()) return null;
  return useAuthStore.getState().user;
}

async function loadInitial(): Promise<SessionHistoryRecord[]> {
  const user = activeUser();
  if (user) return loadSessionsFromSupabase(user.id);
  return loadAllSessions();
}

export const useSessionHistoryStore = create<SessionHistoryState>((set, get) => ({
  sessions: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const sessions = await loadInitial();
    set({ sessions, hydrated: true });
  },

  rehydrate: async () => {
    const sessions = await loadInitial();
    set({ sessions, hydrated: true });
  },

  upsert: async (record) => {
    set((s) => {
      const idx = s.sessions.findIndex((x) => x.id === record.id);
      if (idx >= 0) {
        const next = s.sessions.slice();
        next[idx] = record;
        return { sessions: next };
      }
      return { sessions: [record, ...s.sessions] };
    });
    const user = activeUser();
    if (user) await upsertSessionToSupabase(record, user.id);
    else await putSession(record);
  },

  remove: async (id) => {
    set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
    const user = activeUser();
    if (user) await deleteSessionFromSupabase(id, user.id);
    else await deleteSession(id);
  },

  clear: async () => {
    set({ sessions: [] });
    const user = activeUser();
    if (user) {
      const ids = get().sessions.map((s) => s.id);
      for (const id of ids) await deleteSessionFromSupabase(id, user.id);
    } else {
      await clearAllSessions();
    }
  },
}));
