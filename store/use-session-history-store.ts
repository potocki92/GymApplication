import { create } from "zustand";

import { readDashboardCache, writeDashboardCache } from "@/lib/dashboard-cache";
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

async function activeUserAfterAuth() {
  await waitForAuthInitialization();
  return activeUser();
}

async function loadInitial(): Promise<SessionHistoryRecord[]> {
  const user = await activeUserAfterAuth();
  if (!user) return loadAllSessions();

  const cached = readDashboardCache<SessionHistoryRecord[]>("sessions", user.id);
  if (cached) return cached;

  const sessions = await loadSessionsFromSupabase(user.id);
  writeDashboardCache("sessions", user.id, sessions);
  return sessions;
}

export const useSessionHistoryStore = create<SessionHistoryState>(
  (set, get) => ({
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
      const user = await activeUserAfterAuth();
      if (user) {
        writeDashboardCache("sessions", user.id, get().sessions);
        await upsertSessionToSupabase(record, user.id);
      } else {
        await putSession(record);
      }
    },

    remove: async (id) => {
      set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
      const user = await activeUserAfterAuth();
      if (user) {
        writeDashboardCache("sessions", user.id, get().sessions);
        await deleteSessionFromSupabase(id, user.id);
      } else {
        await deleteSession(id);
      }
    },

    clear: async () => {
      const ids = get().sessions.map((s) => s.id);
      set({ sessions: [] });
      const user = await activeUserAfterAuth();
      if (user) {
        writeDashboardCache("sessions", user.id, []);
        for (const id of ids) await deleteSessionFromSupabase(id, user.id);
      } else {
        await clearAllSessions();
      }
    },
  }),
);
