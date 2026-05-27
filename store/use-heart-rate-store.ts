import { create } from "zustand";

import { classifyZone } from "@/lib/heart-rate/zones";
import type {
  HeartRateSample,
  HeartRateSnapshot,
  HeartRateZone,
  HeartRateZoneDefinition,
  HeartRateZoneId,
  HighHeartRateAlert,
  HRConnectionState,
  HRDevice,
  HRRealtimeEvent,
} from "@/types";

/**
 * Cap on the in-memory sample buffer. 7200 ≈ 2 h @ 1 Hz, which covers any
 * realistic strength session. Older samples are dropped FIFO; the
 * Supabase-persisted history is the source of truth for full replays.
 */
const SAMPLE_BUFFER_CAP = 7200;

/** Minimum gap between successive alerts of the same severity. */
const ALERT_DEBOUNCE_MS = 30_000;

interface HeartRateState {
  samples: HeartRateSample[];
  currentBpm: number | null;
  avgBpm: number | null;
  maxBpm: number | null;
  currentZone: HeartRateZoneId | null;
  /** Time-in-zone accumulator, keyed by `HeartRateZoneId`. */
  zoneDurationsMs: Record<HeartRateZoneId, number>;
  connectionState: HRConnectionState;
  device: HRDevice | null;
  lastAlert: HighHeartRateAlert | null;
  /** Bounds in effect for zone classification; injected by `use-hr-zones`. */
  zoneBounds: HeartRateZoneDefinition[] | null;
  /** User-configured high-HR threshold; null disables alerts. */
  highAlertThresholdBpm: number | null;

  // actions
  ingestEvent: (event: HRRealtimeEvent) => void;
  setZoneBounds: (bounds: HeartRateZoneDefinition[] | null) => void;
  setHighAlertThreshold: (bpm: number | null) => void;
  acknowledgeAlert: () => void;
  hydrate: (snapshot: HeartRateSnapshot) => void;
  reset: () => void;
}

const EMPTY_ZONE_DURATIONS: Record<HeartRateZoneId, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

const initialState = {
  samples: [] as HeartRateSample[],
  currentBpm: null,
  avgBpm: null,
  maxBpm: null,
  currentZone: null,
  zoneDurationsMs: { ...EMPTY_ZONE_DURATIONS },
  connectionState: "idle" as HRConnectionState,
  device: null as HRDevice | null,
  lastAlert: null as HighHeartRateAlert | null,
  zoneBounds: null as HeartRateZoneDefinition[] | null,
  highAlertThresholdBpm: null as number | null,
};

/**
 * Holds live HR state for the current session. Deliberately separated from
 * `useActiveSessionStore` — the session is a finite-state machine, HR is a
 * stream. They are folded back together only at save time, in
 * `active-workout-view.tsx`, via `selectAggregate()`.
 */
export const useHeartRateStore = create<HeartRateState>((set, get) => ({
  ...initialState,

  ingestEvent(event) {
    switch (event.type) {
      case "sample":
        ingestSample(set, get, event.sample);
        return;
      case "device-connected":
        set({ device: event.device });
        return;
      case "device-disconnected":
        set({ device: null });
        return;
      case "connection-state":
        set({ connectionState: event.state });
        return;
      case "error":
        set({ connectionState: "error" });
        return;
    }
  },

  setZoneBounds(bounds) {
    set({ zoneBounds: bounds });
  },

  setHighAlertThreshold(bpm) {
    set({ highAlertThresholdBpm: bpm });
  },

  acknowledgeAlert() {
    set({ lastAlert: null });
  },

  hydrate(snapshot) {
    set({
      samples: snapshot.samples ?? [],
      currentBpm: snapshot.currentBpm ?? null,
      avgBpm: snapshot.avgBpm ?? null,
      maxBpm: snapshot.maxBpm ?? null,
      currentZone: snapshot.currentZone ?? null,
      zoneDurationsMs: snapshotZonesToMap(snapshot.zones),
    });
  },

  reset() {
    set({
      ...initialState,
      zoneDurationsMs: { ...EMPTY_ZONE_DURATIONS },
      // Preserve user-level config that's not session-scoped.
      zoneBounds: get().zoneBounds,
      highAlertThresholdBpm: get().highAlertThresholdBpm,
    });
  },
}));

function ingestSample(
  set: (partial: Partial<HeartRateState>) => void,
  get: () => HeartRateState,
  sample: HeartRateSample,
) {
  const state = get();
  const nextSamples = appendCapped(state.samples, sample);
  const max =
    state.maxBpm == null ? sample.bpm : Math.max(state.maxBpm, sample.bpm);
  const avg = rollingAvg(nextSamples);
  const zone = state.zoneBounds
    ? classifyZone(sample.bpm, state.zoneBounds)
    : null;

  const zoneDurationsMs = accrueZoneDuration(
    state.zoneDurationsMs,
    state.currentZone,
    zone,
    state.samples.at(-1),
    sample,
  );

  const alert = maybeRaiseAlert(state, sample);

  set({
    samples: nextSamples,
    currentBpm: sample.bpm,
    maxBpm: max,
    avgBpm: avg,
    currentZone: zone,
    zoneDurationsMs,
    lastAlert: alert ?? state.lastAlert,
  });
}

function appendCapped(
  samples: HeartRateSample[],
  next: HeartRateSample,
): HeartRateSample[] {
  if (samples.length < SAMPLE_BUFFER_CAP) return [...samples, next];
  return [...samples.slice(1), next];
}

function rollingAvg(samples: HeartRateSample[]): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const s of samples) sum += s.bpm;
  return Math.round(sum / samples.length);
}

function accrueZoneDuration(
  acc: Record<HeartRateZoneId, number>,
  prevZone: HeartRateZoneId | null,
  nextZone: HeartRateZoneId | null,
  prevSample: HeartRateSample | undefined,
  nextSample: HeartRateSample,
): Record<HeartRateZoneId, number> {
  if (prevZone == null || prevSample == null) return acc;
  const dt = Math.max(0, nextSample.ts - prevSample.ts);
  if (dt === 0) return acc;
  // Attribute the elapsed slice to whichever zone the user was in coming into
  // this sample — `nextZone` only takes effect from this tick onward.
  const target = prevZone;
  return {
    ...acc,
    [target]: acc[target] + dt,
  };
}

function maybeRaiseAlert(
  state: HeartRateState,
  sample: HeartRateSample,
): HighHeartRateAlert | null {
  const threshold = state.highAlertThresholdBpm;
  if (threshold == null) return null;
  if (sample.bpm < threshold) return null;
  const last = state.lastAlert;
  if (last && sample.ts - last.ts < ALERT_DEBOUNCE_MS) return null;
  const severity: HighHeartRateAlert["severity"] =
    sample.bpm >= threshold + 10 ? "danger" : "warning";
  return {
    id: `${sample.ts}-${sample.bpm}`,
    bpm: sample.bpm,
    thresholdBpm: threshold,
    ts: sample.ts,
    severity,
  };
}

function snapshotZonesToMap(
  zones: HeartRateZone[] | undefined,
): Record<HeartRateZoneId, number> {
  const map = { ...EMPTY_ZONE_DURATIONS };
  if (!zones) return map;
  for (const z of zones) map[z.zone] = z.durationMs;
  return map;
}

// ── selectors ────────────────────────────────────────────────────────────────

export function selectCurrentSnapshot(state: HeartRateState): HeartRateSnapshot {
  return {
    currentBpm: state.currentBpm ?? undefined,
    avgBpm: state.avgBpm ?? undefined,
    maxBpm: state.maxBpm ?? undefined,
    currentZone: state.currentZone ?? undefined,
    zones: zoneMapToList(state.zoneDurationsMs, state.zoneBounds),
    samples: state.samples,
    source: state.device?.vendor ?? null,
  };
}

/**
 * Returns the aggregated `HeartRateSnapshot` to fold into the
 * `CompletedSession` at save time. Drops the per-sample buffer in favor of a
 * downsampled series so the persisted blob stays small.
 */
export function selectAggregate(state: HeartRateState): HeartRateSnapshot {
  return {
    currentBpm: state.currentBpm ?? undefined,
    avgBpm: state.avgBpm ?? undefined,
    maxBpm: state.maxBpm ?? undefined,
    currentZone: state.currentZone ?? undefined,
    zones: zoneMapToList(state.zoneDurationsMs, state.zoneBounds),
    samples: downsample(state.samples, 720),
    source: state.device?.vendor ?? null,
  };
}

/** Returns samples within the trailing `windowSec` window — chart consumer. */
export function selectChartData(
  state: HeartRateState,
  windowSec: number,
): HeartRateSample[] {
  if (state.samples.length === 0) return state.samples;
  const cutoff = Date.now() - windowSec * 1000;
  // Samples are appended in order, so we can do a binary search; linear scan
  // is fine for a 7200 cap and avoids a helper dep.
  for (let i = 0; i < state.samples.length; i++) {
    if (state.samples[i]!.ts >= cutoff) return state.samples.slice(i);
  }
  return [];
}

function zoneMapToList(
  durations: Record<HeartRateZoneId, number>,
  bounds: HeartRateZoneDefinition[] | null,
): HeartRateZone[] | undefined {
  if (!bounds) return undefined;
  return bounds.map((b) => ({
    zone: b.zone,
    minBpm: b.minBpm,
    maxBpm: b.maxBpm,
    durationMs: durations[b.zone],
  }));
}

function downsample(
  samples: HeartRateSample[],
  target: number,
): HeartRateSample[] {
  if (samples.length <= target) return samples;
  const step = samples.length / target;
  const out: HeartRateSample[] = [];
  for (let i = 0; i < target; i++) {
    out.push(samples[Math.floor(i * step)]!);
  }
  return out;
}
