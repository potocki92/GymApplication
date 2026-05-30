/**
 * Pure, deterministic helpers that turn a list of progress photos into the
 * retention-flavoured signals the UI rewards: weekly streaks, milestones and a
 * transformation summary. Mirrors the style of `lib/stats-utils.ts`.
 *
 * Everything here is side-effect free and `now`-injectable so it can be unit
 * tested without mocking the clock.
 */

import type { ProgressPhotoRecord, ProgressPose } from "@/types";

const DAY_MS = 86_400_000;

/** Monday-aligned week index. 1970-01-01 was a Thursday, hence the +3 offset. */
function weekIndexFromISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return Number.NaN;
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
  return Math.floor((dayNumber + 3) / 7);
}

function weekIndexFromMs(ms: number): number {
  const dayNumber = Math.floor(ms / DAY_MS);
  return Math.floor((dayNumber + 3) / 7);
}

export interface PhotoStreak {
  /** Consecutive weeks (ending at/around now) that contain at least one photo. */
  weeks: number;
  /** Whether the streak is still alive (photo this week or last week). */
  active: boolean;
}

/**
 * Counts consecutive weeks with ≥1 photo, walking backwards from the current
 * week. A one-week grace keeps a weekly cadence alive if the current week has
 * no photo yet but the previous one does.
 */
export function buildPhotoStreak(
  records: ProgressPhotoRecord[],
  now: number = Date.now(),
): PhotoStreak {
  if (records.length === 0) return { weeks: 0, active: false };

  const present = new Set<number>();
  for (const r of records) {
    const w = weekIndexFromISO(r.takenAt);
    if (!Number.isNaN(w)) present.add(w);
  }

  const current = weekIndexFromMs(now);
  let cursor = present.has(current) ? current : current - 1;

  let weeks = 0;
  while (present.has(cursor)) {
    weeks += 1;
    cursor -= 1;
  }

  const active = weeks > 0 && (present.has(current) || present.has(current - 1));
  return { weeks, active };
}

export interface ProgressSummary {
  total: number;
  /** Whole days between the earliest and latest photo. */
  spanDays: number;
  firstWeightKg: number | null;
  lastWeightKg: number | null;
  /** lastWeight − firstWeight (negative = lost weight). Null if <2 weigh-ins. */
  weightDeltaKg: number | null;
}

export function summarizeProgress(
  records: ProgressPhotoRecord[],
): ProgressSummary {
  if (records.length === 0) {
    return {
      total: 0,
      spanDays: 0,
      firstWeightKg: null,
      lastWeightKg: null,
      weightDeltaKg: null,
    };
  }

  const sorted = [...records].sort((a, b) =>
    a.takenAt < b.takenAt ? -1 : a.takenAt > b.takenAt ? 1 : 0,
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const toMs = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const spanDays = Math.round((toMs(last.takenAt) - toMs(first.takenAt)) / DAY_MS);

  const withWeight = sorted.filter((r) => r.weightKg != null);
  const firstWeightKg = withWeight[0]?.weightKg ?? null;
  const lastWeightKg = withWeight[withWeight.length - 1]?.weightKg ?? null;
  const weightDeltaKg =
    withWeight.length >= 2 && firstWeightKg != null && lastWeightKg != null
      ? Math.round((lastWeightKg - firstWeightKg) * 10) / 10
      : null;

  return {
    total: records.length,
    spanDays,
    firstWeightKg,
    lastWeightKg,
    weightDeltaKg,
  };
}

export type MilestoneKind =
  | "first"
  | "count5"
  | "count10"
  | "count25"
  | "count50"
  | "firstComparison";

export interface ProgressMilestone {
  kind: MilestoneKind;
  /** The numeric trigger (photo count, or 2 for the first comparison). */
  value: number;
}

const COUNT_MILESTONES: ReadonlyArray<{ kind: MilestoneKind; value: number }> = [
  { kind: "first", value: 1 },
  { kind: "count5", value: 5 },
  { kind: "count10", value: 10 },
  { kind: "count25", value: 25 },
  { kind: "count50", value: 50 },
];

/** All milestones the current library has already achieved. */
export function buildPhotoMilestones(
  records: ProgressPhotoRecord[],
): ProgressMilestone[] {
  const total = records.length;
  const out: ProgressMilestone[] = COUNT_MILESTONES.filter(
    (m) => total >= m.value,
  ).map((m) => ({ kind: m.kind, value: m.value }));

  // "First comparison" unlocks when any single pose has ≥2 photos.
  const byPose = new Map<ProgressPose, number>();
  for (const r of records) byPose.set(r.pose, (byPose.get(r.pose) ?? 0) + 1);
  if ([...byPose.values()].some((n) => n >= 2)) {
    out.push({ kind: "firstComparison", value: 2 });
  }
  return out;
}

/**
 * The single milestone newly crossed between two record counts, if any. Used to
 * fire a celebration right after an upload. Comparison-based milestones are
 * intentionally excluded here (count-based only) to keep the trigger crisp.
 */
export function newCountMilestone(
  beforeTotal: number,
  afterTotal: number,
): ProgressMilestone | null {
  if (afterTotal <= beforeTotal) return null;
  for (const m of COUNT_MILESTONES) {
    if (beforeTotal < m.value && afterTotal >= m.value) {
      return { kind: m.kind, value: m.value };
    }
  }
  return null;
}
