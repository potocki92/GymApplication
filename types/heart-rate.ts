/**
 * Heart-rate primitives. The Garmin / live-HR integrations land in Etap 5/6
 * but the types live here so the active-workout & summary surfaces can render
 * placeholders today and start accepting real data without a refactor.
 */

export interface HeartRateSample {
  /** Epoch milliseconds. */
  ts: number;
  bpm: number;
}

export interface HeartRateZone {
  zone: 1 | 2 | 3 | 4 | 5;
  minBpm: number;
  maxBpm: number;
  /** Time spent in this zone, milliseconds. */
  durationMs: number;
}

export interface HeartRateSnapshot {
  /** Most recent reading, when streaming. */
  currentBpm?: number;
  avgBpm?: number;
  maxBpm?: number;
  /** Active HR zone the user is currently in (1-5). */
  currentZone?: number;
  /** Breakdown across zones for the session so far. */
  zones?: HeartRateZone[];
  /** Sparse sample series for charts; capped client-side. */
  samples?: HeartRateSample[];
  /** Where the data came from. `null` until a provider is connected. */
  source?: "garmin" | "mock" | "manual" | null;
}
