/**
 * HR-zone breakdown from a stream of bpm samples.
 *
 * Uses %MHR thresholds: Z1 ≤60%, Z2 ≤70%, Z3 ≤80%, Z4 ≤90%, Z5 >90%.
 * `use-hr-zones.ts` computes live zones from the *current* bpm for the UI ring;
 * this module computes time-in-zone aggregates from the entire activity stream
 * for archival storage. The two have different inputs and outputs, so they
 * intentionally live in separate files.
 */

import type { GarminHeartRateSample, HrZoneBreakdown } from "@/types/garmin";

const DEFAULT_MAX_HR = 190;

const EMPTY_ZONES: HrZoneBreakdown = {
  z1Seconds: 0,
  z2Seconds: 0,
  z3Seconds: 0,
  z4Seconds: 0,
  z5Seconds: 0,
};

export function computeHrZones(
  samples: readonly GarminHeartRateSample[],
  maxHr: number = DEFAULT_MAX_HR,
): HrZoneBreakdown {
  if (samples.length < 2) return { ...EMPTY_ZONES };

  const zones = { ...EMPTY_ZONES };

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    const deltaSec = Math.max(
      0,
      (new Date(curr.ts).getTime() - new Date(prev.ts).getTime()) / 1000,
    );
    if (deltaSec === 0 || deltaSec > 60) continue; // gaps > 60s = device paused

    const zone = zoneForBpm(curr.bpm, maxHr);
    switch (zone) {
      case 1: zones.z1Seconds += deltaSec; break;
      case 2: zones.z2Seconds += deltaSec; break;
      case 3: zones.z3Seconds += deltaSec; break;
      case 4: zones.z4Seconds += deltaSec; break;
      case 5: zones.z5Seconds += deltaSec; break;
    }
  }

  return {
    z1Seconds: Math.round(zones.z1Seconds),
    z2Seconds: Math.round(zones.z2Seconds),
    z3Seconds: Math.round(zones.z3Seconds),
    z4Seconds: Math.round(zones.z4Seconds),
    z5Seconds: Math.round(zones.z5Seconds),
  };
}

function zoneForBpm(bpm: number, maxHr: number): 1 | 2 | 3 | 4 | 5 {
  const pct = bpm / maxHr;
  if (pct <= 0.6) return 1;
  if (pct <= 0.7) return 2;
  if (pct <= 0.8) return 3;
  if (pct <= 0.9) return 4;
  return 5;
}
