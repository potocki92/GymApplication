import { create } from "zustand";

import {
  readDashboardCacheEntry,
  writeDashboardCache,
} from "@/lib/dashboard-cache";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  fetchProfileFromSupabase,
  type ProfilePatch,
  upsertProfileToSupabase,
} from "@/lib/supabase-profile";
import type { UserProfile } from "@/types";
import { useAuthStore } from "./use-auth-store";

interface ProfileState {
  profile: UserProfile | null;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  rehydrate: () => Promise<void>;
  update: (patch: ProfilePatch) => Promise<UserProfile | null>;
  markOnboardingComplete: () => Promise<UserProfile | null>;
  reset: () => void;
}

function activeUserId(): string | null {
  if (!isSupabaseConfigured()) return null;
  return useAuthStore.getState().user?.id ?? null;
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

async function loadCachedOrRemoteProfile(): Promise<UserProfile | null> {
  await waitForAuthInitialization();
  const userId = activeUserId();
  if (!userId) return null;

  const cached = readDashboardCacheEntry<UserProfile | null>("profile", userId);
  if (cached) return cached.data;

  const profile = await fetchProfileFromSupabase(userId);
  writeDashboardCache("profile", userId, profile);
  return profile;
}

/**
 * Resolves the current user id, falling back to `supabase.auth.getUser()` when
 * the auth store hasn't been populated. This matters on the onboarding page,
 * whose `(auth)` layout historically did not mount `AuthHydrationGate` — the
 * supabase cookies are valid but the Zustand store is empty, so a sync read
 * would have returned null and silently dropped the submit.
 */
async function resolveUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const fromStore = useAuthStore.getState().user?.id ?? null;
  if (fromStore) return fromStore;
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  hydrated: false,
  loading: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated) return;
    set({ loading: true, error: null });
    const profile = await loadCachedOrRemoteProfile();
    set({ profile, hydrated: true, loading: false });
  },

  rehydrate: async () => {
    set({ loading: true, error: null });
    const profile = await loadCachedOrRemoteProfile();
    set({ profile, hydrated: true, loading: false });
  },

  update: async (patch) => {
    const userId = await resolveUserId();
    if (!userId) {
      set({ error: "not_signed_in" });
      return null;
    }

    const previous = get().profile;
    if (previous) {
      set({ profile: { ...previous, ...patch } as UserProfile });
    }
    set({ loading: true, error: null });
    try {
      const next = await upsertProfileToSupabase(userId, patch);
      if (next) {
        set({ profile: next });
        writeDashboardCache("profile", userId, next);
      }
      return next;
    } catch (e) {
      if (previous) set({ profile: previous });
      set({ error: e instanceof Error ? e.message : "update failed" });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  markOnboardingComplete: async () => {
    const userId = await resolveUserId();
    if (!userId) return null;
    return get().update({ onboardingCompletedAt: new Date().toISOString() });
  },

  reset: () => set({ profile: null, hydrated: false, loading: false, error: null }),
}));

export const selectIsOnboarded = (s: ProfileState): boolean =>
  Boolean(s.profile?.onboardingCompletedAt);
