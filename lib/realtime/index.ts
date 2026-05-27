import type { HeartRateTransport, HRTransportMode } from "@/types";

import { MockHeartRateTransport } from "./mock-transport";
import { SupabaseHeartRateTransport } from "./supabase-transport";

/**
 * Factory that hands back the configured transport. Consumers
 * (`use-live-heart-rate.ts`) hold only the `HeartRateTransport` interface, so
 * adding a new backend (raw WebSocket, BLE, …) is a one-line extension here.
 */
export function createHeartRateTransport(
  mode: HRTransportMode,
): HeartRateTransport {
  switch (mode) {
    case "mock":
      return new MockHeartRateTransport();
    case "supabase":
      return new SupabaseHeartRateTransport();
  }
}

/**
 * Reads the transport mode from public env. Defaults to `mock` so dev / preview
 * never accidentally try to subscribe before the Supabase backend exists.
 */
export function resolveTransportMode(): HRTransportMode {
  const raw = process.env.NEXT_PUBLIC_HR_TRANSPORT;
  if (raw === "supabase" || raw === "mock") return raw;
  return "mock";
}

export { MockHeartRateTransport } from "./mock-transport";
export { SupabaseHeartRateTransport } from "./supabase-transport";
