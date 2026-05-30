import {
  hasFitflowIDB,
  idbTxDone,
  openFitflowDb,
  WORKOUT_SESSION_OUTBOX_STORE,
} from "@/lib/idb-fitflow";
import type { WorkoutSessionOutboxEvent } from "@/types";

const STORE = WORKOUT_SESSION_OUTBOX_STORE;
const SYNCABLE_STATUSES = new Set<WorkoutSessionOutboxEvent["syncStatus"]>([
  "pending",
  "failed",
]);
const ORPHANED_SYNCING_MS = 2 * 60 * 1000;
const RETAIN_SYNCED_MS = 7 * 24 * 60 * 60 * 1000;
let memoryOutbox: WorkoutSessionOutboxEvent[] = [];

function hasIDB(): boolean {
  return hasFitflowIDB();
}

function openDb(): Promise<IDBDatabase> {
  return openFitflowDb();
}

function txDone(tx: IDBTransaction): Promise<void> {
  return idbTxDone(tx);
}

function sortOutboxEvents(events: WorkoutSessionOutboxEvent[]): WorkoutSessionOutboxEvent[] {
  return [...events].sort((a, b) => {
    if (a.sessionId !== b.sessionId) return a.sessionId.localeCompare(b.sessionId);
    if (a.localSequenceNumber !== b.localSequenceNumber) {
      return a.localSequenceNumber - b.localSequenceNumber;
    }
    return a.createdAt - b.createdAt;
  });
}

function isOutboxEvent(value: unknown): value is WorkoutSessionOutboxEvent {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.sessionId === "string" &&
    typeof item.userId === "string" &&
    typeof item.eventType === "string" &&
    typeof item.clientEventId === "string" &&
    typeof item.baseVersion === "number" &&
    typeof item.localSequenceNumber === "number" &&
    typeof item.createdAt === "number" &&
    typeof item.syncStatus === "string" &&
    typeof item.retryCount === "number"
  );
}

export function canUseWorkoutSessionOutbox(): boolean {
  return hasIDB();
}

export async function putWorkoutSessionOutboxEvent(
  event: WorkoutSessionOutboxEvent,
): Promise<void> {
  if (!hasIDB()) {
    const index = memoryOutbox.findIndex((item) => item.id === event.id);
    if (index >= 0) memoryOutbox[index] = event;
    else memoryOutbox.push(event);
    return;
  }
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(event);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function getWorkoutSessionOutboxEvent(
  id: string,
): Promise<WorkoutSessionOutboxEvent | null> {
  if (!hasIDB()) {
    return memoryOutbox.find((event) => event.id === id) ?? null;
  }
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(isOutboxEvent(req.result) ? req.result : null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function updateWorkoutSessionOutboxEvent(
  id: string,
  patch: Partial<WorkoutSessionOutboxEvent>,
): Promise<WorkoutSessionOutboxEvent | null> {
  if (!hasIDB()) {
    const index = memoryOutbox.findIndex((event) => event.id === id);
    if (index < 0) return null;
    memoryOutbox[index] = { ...memoryOutbox[index], ...patch };
    return memoryOutbox[index];
  }
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const updated = await new Promise<WorkoutSessionOutboxEvent | null>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const current = isOutboxEvent(req.result) ? req.result : null;
        if (!current) {
          resolve(null);
          return;
        }
        const next = { ...current, ...patch };
        store.put(next);
        resolve(next);
      };
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    return updated;
  } finally {
    db.close();
  }
}

export async function listWorkoutSessionOutboxEvents(
  sessionId?: string,
): Promise<WorkoutSessionOutboxEvent[]> {
  if (!hasIDB()) {
    const events = sessionId
      ? memoryOutbox.filter((event) => event.sessionId === sessionId)
      : memoryOutbox;
    return sortOutboxEvents(events);
  }
  const db = await openDb();
  try {
    const events = await new Promise<WorkoutSessionOutboxEvent[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const all = ((req.result as unknown[]) ?? []).filter(isOutboxEvent);
        resolve(sessionId ? all.filter((event) => event.sessionId === sessionId) : all);
      };
      req.onerror = () => reject(req.error);
    });
    return sortOutboxEvents(events);
  } finally {
    db.close();
  }
}

export async function listSyncableWorkoutSessionOutboxEvents(
  sessionId: string,
): Promise<WorkoutSessionOutboxEvent[]> {
  const events = await listWorkoutSessionOutboxEvents(sessionId);
  return events.filter((event) => SYNCABLE_STATUSES.has(event.syncStatus));
}

export async function resetStaleSyncingWorkoutSessionOutboxEvents(
  now = Date.now(),
): Promise<number> {
  if (!hasIDB()) {
    let count = 0;
    memoryOutbox = memoryOutbox.map((event) => {
      if (event.syncStatus === "syncing" && now - (event.syncStartedAt ?? 0) > ORPHANED_SYNCING_MS) {
        count += 1;
        return {
          ...event,
          syncStatus: "pending",
          syncStartedAt: null,
          lastError: "Recovered stale sync lock",
        };
      }
      return event;
    });
    return count;
  }
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const events = await new Promise<WorkoutSessionOutboxEvent[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(((req.result as unknown[]) ?? []).filter(isOutboxEvent));
      req.onerror = () => reject(req.error);
    });
    let count = 0;
    for (const event of events) {
      if (event.syncStatus === "syncing" && now - (event.syncStartedAt ?? 0) > ORPHANED_SYNCING_MS) {
        count += 1;
        store.put({
          ...event,
          syncStatus: "pending",
          syncStartedAt: null,
          lastError: "Recovered stale sync lock",
        });
      }
    }
    await txDone(tx);
    return count;
  } finally {
    db.close();
  }
}

export async function cleanupWorkoutSessionOutbox(options: {
  activeSessionIds: string[];
  now?: number;
}): Promise<number> {
  const active = new Set(options.activeSessionIds);
  if (!hasIDB()) {
    const before = memoryOutbox.length;
    memoryOutbox = memoryOutbox.filter((event) => {
      const isOldSynced =
        event.syncStatus === "synced" && (options.now ?? Date.now()) - event.createdAt > RETAIN_SYNCED_MS;
      const isOrphaned = !active.has(event.sessionId) && event.syncStatus === "synced";
      return !(isOldSynced || isOrphaned);
    });
    return before - memoryOutbox.length;
  }
  const now = options.now ?? Date.now();
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const events = await new Promise<WorkoutSessionOutboxEvent[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(((req.result as unknown[]) ?? []).filter(isOutboxEvent));
      req.onerror = () => reject(req.error);
    });
    let count = 0;
    for (const event of events) {
      const isOldSynced =
        event.syncStatus === "synced" && now - event.createdAt > RETAIN_SYNCED_MS;
      const isOrphaned = !active.has(event.sessionId) && event.syncStatus === "synced";
      if (isOldSynced || isOrphaned) {
        count += 1;
        store.delete(event.id);
      }
    }
    await txDone(tx);
    return count;
  } finally {
    db.close();
  }
}


export async function clearWorkoutSessionOutboxForTests(): Promise<void> {
  memoryOutbox = [];
  if (!hasIDB()) return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await txDone(tx);
  } finally {
    db.close();
  }
}
