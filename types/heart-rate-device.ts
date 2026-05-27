import type { HeartRateSource } from "./heart-rate";

/**
 * Heart-rate sensor that produced a stream. Vendor maps 1:1 onto
 * `HeartRateSource`; richer metadata (battery, signal) is optional because
 * not every transport exposes it.
 */
export interface HRDevice {
  id: string;
  vendor: HeartRateSource;
  model?: string;
  /** 0..1 normalized battery level, undefined when unknown. */
  battery?: number;
  /** 0..1 normalized signal quality. */
  signalQuality?: number;
  /** Epoch ms of the last sample seen from this device. */
  lastSeenAt?: number;
}
