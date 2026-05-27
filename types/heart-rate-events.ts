import type { HeartRateSample, HRConnectionState } from "./heart-rate";
import type { HRDevice } from "./heart-rate-device";

/**
 * Discriminated union of events crossing the realtime boundary
 * (mobile → backend → web). Intentionally minimal: transports are dumb pipes.
 *
 * Derived events that depend on the user profile — zone transitions, threshold
 * alerts — are NOT on this union. They live in the store layer where the
 * profile is available, so transports never need to know the user's max HR.
 */
export type HRRealtimeEvent =
  | { type: "sample"; sample: HeartRateSample }
  | { type: "device-connected"; device: HRDevice }
  | {
      type: "device-disconnected";
      deviceId: string;
      reason: "user" | "timeout" | "error";
    }
  | { type: "connection-state"; state: HRConnectionState }
  | { type: "error"; message: string; recoverable: boolean };

export type HRRealtimeEventType = HRRealtimeEvent["type"];

/** Helper for narrowing in switch statements. */
export type HRRealtimeEventOf<T extends HRRealtimeEventType> = Extract<
  HRRealtimeEvent,
  { type: T }
>;
