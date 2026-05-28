import { create } from "zustand";

import type {
  GarminActivity,
  GarminSyncLog,
  GarminSyncResult,
  UserIntegration,
} from "@/types/garmin";

interface StatusResponse {
  integration: UserIntegration | null;
  recentActivities: GarminActivity[];
  recentLogs: GarminSyncLog[];
  demoMode: boolean;
  available: boolean;
}

interface GarminIntegrationState {
  integration: UserIntegration | null;
  recentActivities: GarminActivity[];
  recentLogs: GarminSyncLog[];
  demoMode: boolean;
  available: boolean;
  hydrated: boolean;
  loading: boolean;
  syncing: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  sync: () => Promise<GarminSyncResult | null>;
  disconnect: () => Promise<boolean>;
  reset: () => void;
}

async function fetchStatus(): Promise<StatusResponse | null> {
  try {
    const res = await fetch("/api/integrations/garmin/status", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (res.status === 401 || res.status === 403 || res.status === 503) return null;
    if (!res.ok) throw new Error(`status_failed:${res.status}`);
    return (await res.json()) as StatusResponse;
  } catch {
    return null;
  }
}

export const useGarminIntegrationStore = create<GarminIntegrationState>((set, get) => ({
  integration: null,
  recentActivities: [],
  recentLogs: [],
  demoMode: false,
  available: false,
  hydrated: false,
  loading: false,
  syncing: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated) return;
    set({ loading: true, error: null });
    const data = await fetchStatus();
    if (data) {
      set({
        integration: data.integration,
        recentActivities: data.recentActivities,
        recentLogs: data.recentLogs,
        demoMode: data.demoMode,
        available: data.available,
        hydrated: true,
        loading: false,
      });
    } else {
      set({ available: false, hydrated: true, loading: false });
    }
  },

  refresh: async () => {
    set({ loading: true, error: null });
    const data = await fetchStatus();
    if (data) {
      set({
        integration: data.integration,
        recentActivities: data.recentActivities,
        recentLogs: data.recentLogs,
        demoMode: data.demoMode,
        available: data.available,
        loading: false,
      });
    } else {
      set({ available: false, loading: false });
    }
  },

  sync: async () => {
    if (get().syncing) return null;
    set({ syncing: true, error: null });
    try {
      const res = await fetch("/api/integrations/garmin/sync", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "sync_failed" }));
        set({ error: body.error ?? "sync_failed" });
        return null;
      }
      const result = (await res.json()) as GarminSyncResult;
      // Pull fresh integration/activities/logs after a successful sync.
      await get().refresh();
      return result;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "sync_failed" });
      return null;
    } finally {
      set({ syncing: false });
    }
  },

  disconnect: async () => {
    try {
      const res = await fetch("/api/integrations/garmin/disconnect", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        set({ error: "disconnect_failed" });
        return false;
      }
      await get().refresh();
      return true;
    } catch {
      set({ error: "disconnect_failed" });
      return false;
    }
  },

  reset: () => set({
    integration: null,
    recentActivities: [],
    recentLogs: [],
    demoMode: false,
    available: false,
    hydrated: false,
    loading: false,
    syncing: false,
    error: null,
  }),
}));

export const selectGarminConnected = (s: GarminIntegrationState): boolean =>
  s.integration?.status === "connected";
