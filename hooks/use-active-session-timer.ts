"use client";

import { useSessionClock } from "@/hooks/use-session-clock";
import { useActiveSessionStore } from "@/store";

export interface ActiveSessionTimerState {
  /** True while a session is open (started, not yet finished). */
  isActive: boolean;
  /** True when the open session is currently paused. */
  isPaused: boolean;
  /** Total elapsed workout time in milliseconds. */
  totalMs: number;
}

/**
 * Derives the header timer state from the active session store. The total clock
 * reuses {@link useSessionClock} so it shares the same drift-free anchors as the
 * active workout view instead of duplicating timing logic.
 */
export function useActiveSessionTimer(): ActiveSessionTimerState {
  const status = useActiveSessionStore((s) => s.session?.status);
  const { totalMs } = useSessionClock();

  return {
    isActive: status != null && status !== "idle" && status !== "finished",
    isPaused: status === "paused",
    totalMs,
  };
}
