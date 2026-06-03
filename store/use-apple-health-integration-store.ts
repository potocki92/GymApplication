import { create } from "zustand";

import type {
  AppleHealthIngestLog,
  AppleHealthIntegration,
  AppleHealthSample,
} from "@/types";

interface StatusResponse {
  integration: AppleHealthIntegration | null;
  recentSamples: AppleHealthSample[];
  recentLogs: AppleHealthIngestLog[];
  ingestUrl: string;
  available: boolean;
}

interface AppleHealthIntegrationState {
  integration: AppleHealthIntegration | null;
  recentSamples: AppleHealthSample[];
  recentLogs: AppleHealthIngestLog[];
  ingestUrl: string;
  available: boolean;
  hydrated: boolean;
  loading: boolean;
  working: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Generuje lub regeneruje token ingestu. */
  connect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  reset: () => void;
}

async function fetchStatus(): Promise<StatusResponse | null> {
  try {
    const res = await fetch("/api/integrations/apple-health/status", {
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

export const useAppleHealthIntegrationStore = create<AppleHealthIntegrationState>(
  (set, get) => ({
    integration: null,
    recentSamples: [],
    recentLogs: [],
    ingestUrl: "",
    available: false,
    hydrated: false,
    loading: false,
    working: false,
    error: null,

    hydrate: async () => {
      if (get().hydrated) return;
      set({ loading: true, error: null });
      const data = await fetchStatus();
      if (data) {
        set({
          integration: data.integration,
          recentSamples: data.recentSamples,
          recentLogs: data.recentLogs,
          ingestUrl: data.ingestUrl,
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
          recentSamples: data.recentSamples,
          recentLogs: data.recentLogs,
          ingestUrl: data.ingestUrl,
          available: data.available,
          loading: false,
        });
      } else {
        set({ available: false, loading: false });
      }
    },

    connect: async () => {
      if (get().working) return false;
      set({ working: true, error: null });
      try {
        const res = await fetch("/api/integrations/apple-health/connect", {
          method: "POST",
          credentials: "same-origin",
        });
        if (!res.ok) {
          set({ error: "connect_failed" });
          return false;
        }
        await get().refresh();
        return true;
      } catch {
        set({ error: "connect_failed" });
        return false;
      } finally {
        set({ working: false });
      }
    },

    disconnect: async () => {
      if (get().working) return false;
      set({ working: true, error: null });
      try {
        const res = await fetch("/api/integrations/apple-health/disconnect", {
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
      } finally {
        set({ working: false });
      }
    },

    reset: () =>
      set({
        integration: null,
        recentSamples: [],
        recentLogs: [],
        ingestUrl: "",
        available: false,
        hydrated: false,
        loading: false,
        working: false,
        error: null,
      }),
  }),
);

export const selectAppleHealthConnected = (
  s: AppleHealthIntegrationState,
): boolean => s.integration?.status === "connected";
