/**
 * Heart-rate primitives. The Garmin / live-HR integrations land in Etap 5/6
 * but the types live here so the active-workout & summary surfaces can render
 * placeholders today and start accepting real data without a refactor.
 *
 * Wire shape is intentionally additive: `source`, `deviceId`, `serverTs` are
 * optional so existing call-sites that only emit `{ ts, bpm }` keep working
 * while the realtime layer adds richer context.
 */

export type HeartRateSource =
  | "garmin"
  | "polar"
  | "wahoo"
  | "mock"
  | "manual";

export type HeartRateZoneId = 1 | 2 | 3 | 4 | 5;

export interface HeartRateSample {
  /** Epoch milliseconds — recorded on the device or mobile bridge. */
  ts: number;
  bpm: number;
  /**
   * Server-side ingest timestamp. Set by the backend on receipt so the web
   * client can detect skew between device clock and server clock.
   */
  serverTs?: number;
  source?: HeartRateSource;
  /** Stable id of the strap / watch that produced this reading. */
  deviceId?: string;
}

export interface HeartRateZone {
  zone: HeartRateZoneId;
  minBpm: number;
  maxBpm: number;
  /** Time spent in this zone, milliseconds. */
  durationMs: number;
}

/**
 * Static definition of a zone (boundaries + presentation). Distinct from
 * `HeartRateZone` which is the per-session accumulator.
 */
export interface HeartRateZoneDefinition {
  zone: HeartRateZoneId;
  minBpm: number;
  maxBpm: number;
  /** Short label key resolved by i18n at render time (e.g. "z1"). */
  labelKey: "z1" | "z2" | "z3" | "z4" | "z5";
  /** Tailwind color tokens shared between chart, panel and legend. */
  color: {
    fg: string;
    bg: string;
    ring: string;
  };
}

export interface HeartRateSnapshot {
  /** Most recent reading, when streaming. */
  currentBpm?: number;
  avgBpm?: number;
  maxBpm?: number;
  /** Active HR zone the user is currently in (1-5). */
  currentZone?: HeartRateZoneId;
  /** Breakdown across zones for the session so far. */
  zones?: HeartRateZone[];
  /** Sparse sample series for charts; capped client-side. */
  samples?: HeartRateSample[];
  /** Where the data came from. `null` until a provider is connected. */
  source?: HeartRateSource | null;
}

/**
 * Connection lifecycle of a `HeartRateTransport`. UI renders this verbatim
 * as the "connecting / live / reconnecting" badge in the HR panel.
 */
export type HRConnectionState =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed"
  | "error";

/**
 * Threshold-crossing event produced by the store (not the transport — see
 * `types/heart-rate-events.ts`). Lives here so any surface that surfaces an
 * alert (banner, toast, future push) shares the same shape.
 */
export interface HighHeartRateAlert {
  id: string;
  bpm: number;
  thresholdBpm: number;
  ts: number;
  severity: "warning" | "danger";
}
