import { SESSION_SCHEMA_VERSION, type ActiveSession } from "@/types";

const DB_NAME = "fitflow";
const STORE = "active-session";
const KEY = "current";
const FLAG = "fitflow.activeSessionId";
const CACHE_VERSION = 2;
const STALE_SESSION_MS = 36 * 60 * 60 * 1000;
const RESUMABLE_STATUSES = new Set<ActiveSession["status"]>([
  "planning",
  "executing",
  "resting",
  "paused",
]);

export interface ActiveSessionCacheSnapshot {
  cacheVersion: typeof CACHE_VERSION;
  session: ActiveSession;
  serverVersion: number | null;
  dirty: boolean;
  savedAt: number;
}

interface SaveSessionOptions {
  serverVersion?: number | null;
  dirty?: boolean;
  savedAt?: number;
}

function hasIDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isActiveSession(value: unknown): value is ActiveSession {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.workoutId === "string" &&
    typeof value.workoutName === "string" &&
    typeof value.status === "string" &&
    typeof value.currentExerciseIndex === "number" &&
    typeof value.currentSetIndex === "number" &&
    Array.isArray(value.exercises) &&
    typeof value.version === "number" &&
    typeof value.updatedAt === "number"
  );
}

function isCacheSnapshot(value: unknown): value is ActiveSessionCacheSnapshot {
  if (!isRecord(value)) return false;
  return (
    value.cacheVersion === CACHE_VERSION &&
    isActiveSession(value.session) &&
    (typeof value.serverVersion === "number" || value.serverVersion === null) &&
    typeof value.dirty === "boolean" &&
    typeof value.savedAt === "number"
  );
}

function normalizeSnapshot(value: unknown): ActiveSessionCacheSnapshot | null {
  if (isCacheSnapshot(value)) return value;
  if (isActiveSession(value)) {
    return {
      cacheVersion: CACHE_VERSION,
      session: value,
      serverVersion: null,
      dirty: true,
      savedAt: value.updatedAt,
    };
  }
  return null;
}

function isStale(snapshot: ActiveSessionCacheSnapshot, now = Date.now()): boolean {
  return (
    snapshot.session.version !== SESSION_SCHEMA_VERSION ||
    !RESUMABLE_STATUSES.has(snapshot.session.status) ||
    now - snapshot.savedAt > STALE_SESSION_MS
  );
}

/** Synchronous cold-load hint: is there (probably) a session to recover? */
export function hasStoredSessionFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FLAG) != null;
  } catch {
    return false;
  }
}

export async function saveSessionSnapshot(
  session: ActiveSession,
  options: SaveSessionOptions = {},
): Promise<void> {
  if (!hasIDB()) return;
  const savedAt = options.savedAt ?? Date.now();
  const snapshot: ActiveSessionCacheSnapshot = {
    cacheVersion: CACHE_VERSION,
    session: { ...session, updatedAt: session.updatedAt },
    serverVersion: options.serverVersion ?? null,
    dirty: options.dirty ?? options.serverVersion == null,
    savedAt,
  };

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(snapshot, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    try {
      window.localStorage.setItem(FLAG, session.id);
    } catch {
      /* storage may be unavailable (private mode) — recovery just won't fire */
    }
  } catch {
    /* persistence is best-effort; never break the workout on a storage error */
  }
}

export async function saveSession(
  session: ActiveSession,
  options?: SaveSessionOptions,
): Promise<void> {
  await saveSessionSnapshot(session, options);
}

export async function loadSessionSnapshot(): Promise<ActiveSessionCacheSnapshot | null> {
  if (!hasIDB()) return null;
  try {
    const db = await openDb();
    const result = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    const snapshot = normalizeSnapshot(result);
    if (!snapshot) return null;
    if (isStale(snapshot)) {
      await clearSession();
      return null;
    }
    return snapshot;
  } catch {
    return null;
  }
}

export async function loadSession(): Promise<ActiveSession | null> {
  const snapshot = await loadSessionSnapshot();
  return snapshot?.session ?? null;
}

export async function clearSession(sessionId?: string): Promise<void> {
  try {
    const current = window.localStorage.getItem(FLAG);
    if (!sessionId || current === sessionId) {
      window.localStorage.removeItem(FLAG);
    }
  } catch {
    /* ignore */
  }
  if (!hasIDB()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}
