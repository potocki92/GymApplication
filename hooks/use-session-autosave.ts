"use client";

import { useEffect } from "react";

import { saveSession } from "@/lib/idb-session";
import { useActiveSessionStore } from "@/store";

/**
 * Persists the active session for crash recovery: a debounced write on every change
 * plus a 5s backstop interval and an immediate flush when the tab is hidden/closed.
 * Best-effort — storage failures never interrupt the workout. Clearing is handled
 * explicitly by the save/abort flows, not here.
 */
export function useSessionAutosave(): void {
  const session = useActiveSessionStore((s) => s.session);

  useEffect(() => {
    if (!session) return;
    const id = window.setTimeout(() => void saveSession(session), 800);
    return () => window.clearTimeout(id);
  }, [session]);

  useEffect(() => {
    const flush = () => {
      const current = useActiveSessionStore.getState().session;
      if (current) void saveSession(current);
    };
    const interval = window.setInterval(flush, 5000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);
}
