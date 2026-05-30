"use client";

import { useMemo, useState } from "react";

import { selectLatestPerMonth } from "@/store";
import type { ProgressPhotoRecord, ProgressPose } from "@/types";

export type ComparePreset = "transformation" | "monthToMonth" | "manual";

export interface ComparisonEndpoints {
  preset: ComparePreset;
  /** Earlier ("Początek") photo, or null when fewer than two photos exist. */
  before: ProgressPhotoRecord | null;
  /** Later ("Teraz") photo, or null when fewer than two photos exist. */
  after: ProgressPhotoRecord | null;
  setPreset: (preset: ComparePreset) => void;
  setBefore: (id: string) => void;
  setAfter: (id: string) => void;
}

/**
 * Single source of truth for the unified before/after comparison slider.
 *
 * Resolves a `before`/`after` pair from the active preset, sharing the same
 * fallback logic the old standalone comparison/month-to-month components used.
 * Picking a photo manually flips the preset to "manual"; switching pose resets
 * the manual selection (memo keys include `pose`, and stale ids fall back).
 */
export function useComparisonEndpoints(
  /** Pose-filtered records, newest first. */
  filtered: ProgressPhotoRecord[],
  /** All records across poses. */
  records: ProgressPhotoRecord[],
  pose: ProgressPose,
): ComparisonEndpoints {
  const [preset, setPreset] = useState<ComparePreset>("transformation");
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);

  // Ascending: index 0 = oldest, last = newest.
  const ascending = useMemo(
    () => [...filtered].sort((a, b) => (a.takenAt < b.takenAt ? -1 : 1)),
    [filtered],
  );

  const pair = useMemo<{
    before: ProgressPhotoRecord | null;
    after: ProgressPhotoRecord | null;
  }>(() => {
    const oldest = ascending[0] ?? null;
    const newest = ascending[ascending.length - 1] ?? null;

    if (preset === "monthToMonth") {
      const latest = selectLatestPerMonth(records, pose);
      if (latest.length < 2) return { before: null, after: null };
      return { before: latest[1], after: latest[0] };
    }

    if (preset === "manual") {
      // Fall back to oldest/newest when a pick is missing or no longer in the
      // list (e.g. after switching pose or deleting a photo).
      const before =
        ascending.find((r) => r.id === beforeId) ?? oldest;
      const after = ascending.find((r) => r.id === afterId) ?? newest;
      return { before, after };
    }

    // "transformation": oldest vs newest in pose.
    return { before: oldest, after: newest };
  }, [preset, ascending, beforeId, afterId, records, pose]);

  return {
    preset,
    before: pair.before,
    after: pair.after,
    setPreset: (next) => setPreset(next),
    setBefore: (id) => {
      setBeforeId(id);
      setPreset("manual");
    },
    setAfter: (id) => {
      setAfterId(id);
      setPreset("manual");
    },
  };
}
