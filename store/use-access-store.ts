import { create } from "zustand";

import type { AppAccessUser } from "@/types";

interface AccessCapabilities {
  garminConnect: boolean;
  manageSystem: boolean;
  hiddenDevPanel: boolean;
}

interface AccessStatusResponse {
  user: Pick<AppAccessUser, "id" | "email" | "role" | "planId">;
  capabilities: AccessCapabilities;
}

interface AccessState {
  user: Pick<AppAccessUser, "id" | "email" | "role" | "planId"> | null;
  capabilities: AccessCapabilities | null;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  rehydrate: () => Promise<void>;
  reset: () => void;
}

const EMPTY_CAPABILITIES: AccessCapabilities = {
  garminConnect: false,
  manageSystem: false,
  hiddenDevPanel: false,
};

async function fetchAccessStatus(): Promise<AccessStatusResponse | null> {
  try {
    const res = await fetch("/api/access/me", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (res.status === 401 || res.status === 503) return null;
    if (!res.ok) throw new Error(`access_status_failed:${res.status}`);
    return (await res.json()) as AccessStatusResponse;
  } catch {
    return null;
  }
}

export const useAccessStore = create<AccessState>((set, get) => ({
  user: null,
  capabilities: null,
  hydrated: false,
  loading: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated) return;
    await get().rehydrate();
  },

  rehydrate: async () => {
    set({ loading: true, error: null });
    const data = await fetchAccessStatus();
    if (data) {
      set({
        user: data.user,
        capabilities: data.capabilities,
        hydrated: true,
        loading: false,
      });
      return;
    }

    set({
      user: null,
      capabilities: EMPTY_CAPABILITIES,
      hydrated: true,
      loading: false,
    });
  },

  reset: () => set({
    user: null,
    capabilities: null,
    hydrated: false,
    loading: false,
    error: null,
  }),
}));
