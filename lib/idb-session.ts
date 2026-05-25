import type { ActiveSession } from "@/types";

const DB_NAME = "fitflow";
const STORE = "active-session";
const KEY = "current";
const FLAG = "fitflow.activeSessionId";

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

/** Synchronous cold-load hint: is there (probably) a session to recover? */
export function hasStoredSessionFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FLAG) != null;
  } catch {
    return false;
  }
}

export async function saveSession(session: ActiveSession): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ ...session, updatedAt: Date.now() }, KEY);
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

export async function loadSession(): Promise<ActiveSession | null> {
  if (!hasIDB()) return null;
  try {
    const db = await openDb();
    const result = await new Promise<ActiveSession | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as ActiveSession) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    window.localStorage.removeItem(FLAG);
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
