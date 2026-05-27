"use client";

import { useEffect } from "react";

import {
  createHeartRateTransport,
  resolveTransportMode,
} from "@/lib/realtime";
import { useHeartRateStore } from "@/store";
import type { HRTransportMode } from "@/types";

interface UseLiveHeartRateOptions {
  /** Force a transport — overrides env. Tests/Storybook pin "mock". */
  transport?: HRTransportMode;
  /** When false, do nothing. Used to gate the hook on a feature flag. */
  enabled?: boolean;
}

/**
 * Wires the configured `HeartRateTransport` into the `useHeartRateStore`. One
 * instance per active session — typically mounted by `active-workout-view.tsx`
 * once the session is in `executing`/`resting`.
 *
 * Lifecycle:
 *   - On mount, creates a transport via the factory, subscribes, and
 *     `connect()`s with a fresh `AbortController`.
 *   - On unmount (or `enabled` flip), aborts the controller and resets the
 *     store. The transport tears its channel down via the abort signal.
 */
export function useLiveHeartRate(
  sessionId: string | null,
  options: UseLiveHeartRateOptions = {},
): void {
  const ingestEvent = useHeartRateStore((s) => s.ingestEvent);
  const reset = useHeartRateStore((s) => s.reset);

  const enabled = options.enabled !== false && sessionId != null;
  const mode = options.transport ?? resolveTransportMode();

  useEffect(() => {
    if (!enabled || sessionId == null) return;

    const controller = new AbortController();
    const transport = createHeartRateTransport(mode);
    const unsubscribe = transport.subscribe(ingestEvent);

    void transport.connect(sessionId, controller.signal).catch((err) => {
      console.error("[use-live-heart-rate] connect failed", err);
    });

    return () => {
      unsubscribe();
      controller.abort();
      reset();
    };
  }, [enabled, sessionId, mode, ingestEvent, reset]);
}
