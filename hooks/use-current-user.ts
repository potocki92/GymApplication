"use client";

import { useAuthStore, useProfileStore } from "@/store";

export interface CurrentUser {
  /** Profile display name; falls back to a friendly placeholder. */
  name: string;
  /** 1-2 letter avatar fallback derived from the resolved name. */
  initials: string;
  email: string | null;
  /** True once the profile and auth stores have settled. */
  ready: boolean;
}

const FALLBACK_NAME = "Sportowcu";

function computeInitials(source: string): string {
  const words = source.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "RE";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Resolves the signed-in user's identity for display. Prefers the profile's
 * display name and then a friendly placeholder, keeping email available only as
 * secondary account metadata.
 */
export function useCurrentUser(): CurrentUser {
  const profile = useProfileStore((s) => s.profile);
  const profileHydrated = useProfileStore((s) => s.hydrated);
  const authUser = useAuthStore((s) => s.user);
  const authInitialized = useAuthStore((s) => s.initialized);

  const email = profile?.email ?? authUser?.email ?? null;
  const fromName = profile?.displayName?.trim() || null;
  const name = fromName ?? FALLBACK_NAME;
  const initials = computeInitials(fromName ?? email ?? "");

  return {
    name,
    initials,
    email,
    ready: profileHydrated && authInitialized,
  };
}
