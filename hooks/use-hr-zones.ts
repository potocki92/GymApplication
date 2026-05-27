"use client";

import { useEffect, useMemo } from "react";

import { computeZoneBounds } from "@/lib/heart-rate/zones";
import { useHeartRateStore, useProfileStore } from "@/store";
import type { HeartRateZoneDefinition } from "@/types";

/**
 * Derives the user's HR-zone boundaries from their profile and keeps the
 * heart-rate store in sync so per-sample classification has the right
 * thresholds. Returns the bounds (or null when the profile is missing the
 * required data) so UI can render them directly.
 */
export function useHrZones(): HeartRateZoneDefinition[] | null {
  const profile = useProfileStore((s) => s.profile);
  const setZoneBounds = useHeartRateStore((s) => s.setZoneBounds);

  const bounds = useMemo(() => {
    if (!profile) return null;
    return computeZoneBounds(profile);
  }, [profile]);

  useEffect(() => {
    setZoneBounds(bounds);
  }, [bounds, setZoneBounds]);

  return bounds;
}
