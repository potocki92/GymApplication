"use client";

import { useEffect, useState } from "react";

import { computeClock, type ClockValues } from "@/lib/session-utils";
import { useActiveSessionStore } from "@/store";

const ZERO: ClockValues = {
  totalMs: 0,
  setMs: 0,
  restRemainingMs: 0,
  restElapsedMs: 0,
  restDone: false,
};

/**
 * Drift-free three-timer clock. Every animation frame it recomputes total / set /
 * rest values from the session's absolute timestamp anchors (never from accumulated
 * ticks), so it stays accurate across pause/resume and tab backgrounding. The rAF
 * loop only runs while a clock is actually moving (`executing` / `resting`); in
 * every other state the frozen values are computed once.
 */
export function useSessionClock(): ClockValues {
  const status = useActiveSessionStore((s) => s.session?.status);
  const [clock, setClock] = useState<ClockValues>(ZERO);

  useEffect(() => {
    const read = () =>
      computeClock(useActiveSessionStore.getState().session, Date.now());

    let raf = 0;
    if (status === "executing" || status === "resting") {
      const loop = () => {
        setClock(read());
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    } else {
      // settle on the frozen value once, deferred out of the effect body
      raf = requestAnimationFrame(() => setClock(read()));
    }
    return () => cancelAnimationFrame(raf);
  }, [status]);

  return clock;
}
