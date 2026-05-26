"use client";

import { useEffect, useState } from "react";

import { clearSession, hasStoredSessionFlag, loadSession } from "@/lib/idb-session";
import { useActiveSessionStore } from "@/store";
import { SESSION_SCHEMA_VERSION, type ActiveSession } from "@/types";

const RESUMABLE = new Set(["executing", "resting", "paused"]);

interface Recovery {
  pending: ActiveSession | null;
  resume: () => void;
  discard: () => void;
}

/**
 * On cold load, looks for an interrupted session in IndexedDB and exposes it so the
 * UI can offer Resume / Discard. Only sessions that were mid-workout are offered;
 * finished/incompatible blobs are cleared silently. No-op if a session is already
 * live in the store (e.g. the user is on the active screen).
 */
export function useSessionRecovery(): Recovery {
  const [pending, setPending] = useState<ActiveSession | null>(null);
  const hasLiveSession = useActiveSessionStore((s) => s.session != null);

  useEffect(() => {
    if (hasLiveSession || !hasStoredSessionFlag()) return;
    let cancelled = false;
    void loadSession().then((stored) => {
      if (cancelled || !stored) return;
      if (
        stored.version !== SESSION_SCHEMA_VERSION ||
        !RESUMABLE.has(stored.status)
      ) {
        void clearSession();
        return;
      }
      setPending(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [hasLiveSession]);

  return {
    pending,
    resume: () => {
      if (!pending) return;
      useActiveSessionStore.getState().hydrate(pending);
      setPending(null);
    },
    discard: () => {
      void clearSession();
      setPending(null);
    },
  };
}
