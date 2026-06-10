import type { BodyMetricKey, BodyMetricRecord } from "@/types";

/** Records sorted by date ascending (earliest first). */
export function sortRecords(records: BodyMetricRecord[]): BodyMetricRecord[] {
  return [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.updatedAt - b.updatedAt;
  });
}

/** Subtract `days` from an ISO `YYYY-MM-DD` date. UTC-safe. */
function subDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Simple Moving Average over the trailing 7 calendar days for the given metric.
 * Returns an array parallel to `sorted` — i.e. element i is the SMA-7 anchored at
 * record i. Returns NaN for buckets where no value is present. Tolerates date gaps
 * (the window is a calendar window, not a record-count window).
 */
export function sma7(
  sorted: BodyMetricRecord[],
  metric: BodyMetricKey,
): number[] {
  return sorted.map((current, i) => {
    const windowStart = subDaysISO(current.date, 6);
    let sum = 0;
    let count = 0;
    for (let j = i; j >= 0; j -= 1) {
      const r = sorted[j];
      if (r.date < windowStart) break;
      const v = r[metric];
      if (typeof v === "number" && Number.isFinite(v)) {
        sum += v;
        count += 1;
      }
    }
    return count === 0 ? Number.NaN : sum / count;
  });
}

/**
 * % of the journey from start → target that's been covered. Works regardless of
 * direction (cut vs. bulk). Clamped to [0, 100]. Returns 100 when start === target.
 */
export function progressToGoalPct(
  startKg: number,
  currentKg: number,
  targetKg: number,
): number {
  if (startKg === targetKg) return 100;
  const pct = ((startKg - currentKg) / (startKg - targetKg)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

export type ProgressTier = "ahead" | "on-track" | "behind";

/**
 * Coarse classification for color-coding the progress UI. Thresholds are
 * intentionally simple — a richer model can layer deadline awareness later.
 */
export function progressTier(pct: number): ProgressTier {
  if (pct >= 75) return "ahead";
  if (pct >= 40) return "on-track";
  return "behind";
}

/**
 * Newest record with `date <= isoDate` that is at most `toleranceDays` older.
 * Ties on the same date are broken by `updatedAt` (last write wins). Used to
 * pair progress photos with the body-metric log without forcing same-day entries.
 */
export function nearestMetricOnOrBefore(
  records: BodyMetricRecord[],
  isoDate: string,
  toleranceDays = 7,
): BodyMetricRecord | null {
  const earliest = subDaysISO(isoDate, toleranceDays);
  let best: BodyMetricRecord | null = null;
  for (const r of records) {
    if (r.date > isoDate || r.date < earliest) continue;
    if (!best || r.date > best.date || (r.date === best.date && r.updatedAt > best.updatedAt)) {
      best = r;
    }
  }
  return best;
}

/**
 * Per-metric difference `after − before`, present only when both sides carry a
 * finite value for that metric.
 */
export function metricDeltas(
  before: BodyMetricRecord | null,
  after: BodyMetricRecord | null,
): Partial<Record<BodyMetricKey, number>> {
  if (!before || !after) return {};
  const keys: BodyMetricKey[] = [
    "weightKg",
    "chestCm",
    "waistCm",
    "hipsCm",
    "bodyFatPct",
  ];
  const out: Partial<Record<BodyMetricKey, number>> = {};
  for (const key of keys) {
    const a = before[key];
    const b = after[key];
    if (
      typeof a === "number" &&
      Number.isFinite(a) &&
      typeof b === "number" &&
      Number.isFinite(b)
    ) {
      out[key] = b - a;
    }
  }
  return out;
}

/** Latest record that has a value for the given metric, or null. */
export function latestForMetric(
  records: BodyMetricRecord[],
  metric: BodyMetricKey,
): BodyMetricRecord | null {
  let best: BodyMetricRecord | null = null;
  for (const r of records) {
    if (typeof r[metric] !== "number" || !Number.isFinite(r[metric])) continue;
    if (!best || r.date > best.date || (r.date === best.date && r.updatedAt > best.updatedAt)) {
      best = r;
    }
  }
  return best;
}
