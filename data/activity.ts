import type { ActivityDay, ActivityLevel } from "@/types";

/** Number of week-columns rendered in the heatmap. */
export const ACTIVITY_WEEKS = 18;

const END_ISO = "2024-05-26"; // Sunday of the reference week
const SEED = 20240526;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministically generated contribution-style data. Built once at module
 * load (no Date.now / Math.random at render) so server and client agree and
 * there is no hydration mismatch.
 */
function buildActivity(): ActivityDay[] {
  const end = new Date(`${END_ISO}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (ACTIVITY_WEEKS * 7 - 1));

  const rand = mulberry32(SEED);
  const days: ActivityDay[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const r = rand();
    let level: ActivityLevel = 0;
    if (r > 0.86) level = 4;
    else if (r > 0.68) level = 3;
    else if (r > 0.46) level = 2;
    else if (r > 0.26) level = 1;
    days.push({ date: toISO(cursor), level });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export const ACTIVITY: ActivityDay[] = buildActivity();
