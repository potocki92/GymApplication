const DB_NAME = "fitflow";
const DB_VERSION = 2;

export const ACTIVE_SESSION_STORE = "active-session";
export const WORKOUT_SESSION_OUTBOX_STORE = "workout-session-outbox";

export function hasFitflowIDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function ensureWorkoutSessionOutboxStore(db: IDBDatabase): void {
  if (db.objectStoreNames.contains(WORKOUT_SESSION_OUTBOX_STORE)) return;

  const store = db.createObjectStore(WORKOUT_SESSION_OUTBOX_STORE, {
    keyPath: "id",
  });
  store.createIndex("session-status-sequence", [
    "sessionId",
    "syncStatus",
    "localSequenceNumber",
  ]);
  store.createIndex("client-event", "clientEventId", { unique: true });
  store.createIndex("created-at", "createdAt");
}

function upgradeFitflowDb(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(ACTIVE_SESSION_STORE)) {
    db.createObjectStore(ACTIVE_SESSION_STORE);
  }
  ensureWorkoutSessionOutboxStore(db);
}

export function openFitflowDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => upgradeFitflowDb(req.result);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
  });
}

export function idbTxDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
