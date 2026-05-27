import type { HRConnectionState } from "./heart-rate";
import type { HRRealtimeEvent } from "./heart-rate-events";

export type HRTransportMode = "supabase" | "mock";

export type HRRealtimeEventHandler = (event: HRRealtimeEvent) => void;
export type HRUnsubscribe = () => void;

/**
 * Contract every realtime backend must satisfy. UI/store/hooks consume only
 * this interface — they never import a transport implementation directly.
 *
 * Lifecycle:
 *   1. Caller subscribes via `subscribe(handler)` to receive events.
 *   2. Caller invokes `connect(sessionId, signal)`. The transport opens its
 *      underlying channel (Supabase Realtime, raw WebSocket, BLE, …) and
 *      starts emitting events.
 *   3. Aborting the supplied `AbortSignal` is the ONLY way to tear the
 *      connection down — there is no `disconnect()` method, by design. This
 *      mirrors React 19 / Next 16 idioms and keeps cleanup tied to a single
 *      `AbortController` ref in `use-live-heart-rate.ts`.
 */
export interface HeartRateTransport {
  /** Current lifecycle state. Mirrors the last `connection-state` event. */
  readonly state: HRConnectionState;
  /** Opens the channel. Resolves once the channel is `open` or rejects on fatal error. */
  connect(sessionId: string, signal: AbortSignal): Promise<void>;
  /** Register an event listener. Returns an unsubscribe fn. */
  subscribe(handler: HRRealtimeEventHandler): HRUnsubscribe;
}
