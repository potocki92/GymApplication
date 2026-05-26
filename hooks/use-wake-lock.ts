"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Keeps the screen awake while `enabled`. Re-acquires the lock when the tab becomes
 * visible again (browsers auto-release it on hide). Fully no-op and silent on
 * browsers without the Screen Wake Lock API.
 */
export function useWakeLock(enabled: boolean): { supported: boolean; active: boolean } {
  const supported =
    typeof navigator !== "undefined" && "wakeLock" in navigator;
  const [active, setActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;

    const acquire = async () => {
      if (!enabled || document.visibilityState !== "visible") return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        setActive(true);
        sentinel.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false);
      }
    };

    const release = () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) void sentinel.release();
      setActive(false);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && enabled) void acquire();
    };

    if (enabled) void acquire();
    else release();

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [enabled, supported]);

  return { supported, active };
}
