/**
 * Deterministic Garmin mock for env without configured secrets.
 *
 * Generates a stable set of synthetic activities + HR samples so the UI flow
 * (connect → sync → history badge) can be reviewed without a real Garmin
 * account. Uses mulberry32 PRNG (same as `data/activity.ts`) to avoid
 * hydration mismatches.
 */

import type { GarminActivityDto } from "./api-client";
import type { GarminHeartRateSample } from "@/types/garmin";

const SEED = 0x6172_6d69; // "armi"
const ACTIVITY_COUNT = 10;
const TYPES = ["running", "cycling", "strength", "swimming", "walking"] as const;

export function buildMockActivities(now: Date = new Date()): GarminActivityDto[] {
  const rand = mulberry32(SEED);
  const activities: GarminActivityDto[] = [];

  for (let i = 0; i < ACTIVITY_COUNT; i++) {
    const type = TYPES[Math.floor(rand() * TYPES.length)];
    const daysAgo = Math.floor(rand() * 28) + i;
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - daysAgo);
    start.setUTCHours(7 + Math.floor(rand() * 12), Math.floor(rand() * 60), 0, 0);

    const duration = Math.floor(rand() * 60 * 60) + 25 * 60; // 25-85 min
    const isCardio = type !== "strength";

    activities.push({
      garminActivityId: `mock-${SEED}-${i}`,
      activityType: type,
      startTime: start.toISOString(),
      durationSeconds: duration,
      distanceMeters: isCardio ? Math.round((rand() * 9 + 3) * 1000) : null,
      calories: Math.round(rand() * 400 + 200),
      avgHeartRateBpm: Math.round(rand() * 30 + 130),
      maxHeartRateBpm: Math.round(rand() * 25 + 165),
      avgSpeedMps: isCardio ? Number((rand() * 3 + 2).toFixed(2)) : null,
      elevationGainM: isCardio ? Math.round(rand() * 200) : null,
      raw: { mock: true, seed: SEED, index: i },
    });
  }

  return activities.sort((a, b) =>
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
}

export function buildMockHrSamples(activity: GarminActivityDto): GarminHeartRateSample[] {
  const rand = mulberry32(hashString(activity.garminActivityId));
  const samples: GarminHeartRateSample[] = [];
  const start = new Date(activity.startTime).getTime();
  const intervalMs = 10_000; // sample every 10s
  const totalSamples = Math.floor(activity.durationSeconds / 10);
  const avg = activity.avgHeartRateBpm ?? 145;
  const max = activity.maxHeartRateBpm ?? avg + 20;
  const amplitude = max - avg;

  for (let i = 0; i < totalSamples; i++) {
    const phase = (i / totalSamples) * Math.PI * 2;
    const bpm = Math.round(avg + Math.sin(phase) * amplitude * 0.6 + (rand() - 0.5) * 6);
    samples.push({
      garminActivityId: activity.garminActivityId,
      ts: new Date(start + i * intervalMs).toISOString(),
      bpm: Math.max(60, Math.min(220, bpm)),
    });
  }

  return samples;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
