import {
  hasFitflowIDB,
  idbTxDone,
  openFitflowDb,
  WORKOUT_SESSION_OUTBOX_STORE,
} from "@/lib/idb-fitflow";
import { isJsonRecord, isWorkoutSessionJson } from "@/lib/workout-session-serialization";
import type { WorkoutSessionJson, WorkoutSessionOutboxEvent } from "@/types";

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

function normalizedOutboxEvent(value: unknown): WorkoutSessionOutboxEvent | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    typeof item.sessionId !== "string" ||
    typeof item.userId !== "string" ||
    typeof item.eventType !== "string" ||
    typeof item.clientEventId !== "string" ||
    typeof item.baseVersion !== "number" ||
    typeof item.localSequenceNumber !== "number" ||
    typeof item.createdAt !== "number" ||
    typeof item.syncStatus !== "string" ||
    typeof item.retryCount !== "number" ||
    !isWorkoutSessionJson(item.payload)
  ) {
    return null;
  }

  const legacyPayload = item.payload;
  const nextState = isWorkoutSessionJson(item.nextState)
    ? item.nextState
    : isJsonRecord(legacyPayload) && isWorkoutSessionJson(legacyPayload.nextState)
      ? legacyPayload.nextState
      : null;

  if (!nextState) return null;

  return {
    ...(item as Omit<WorkoutSessionOutboxEvent, "payload" | "nextState">),
    payload: legacyPayload as WorkoutSessionJson,
    nextState,
  };
}

function stripLegacyNextState(payload: WorkoutSessionJson): WorkoutSessionJson {
  if (!isJsonRecord(payload) || !("nextState" in payload)) return payload;
  const rest = { ...payload };
  delete rest.nextState;
  return rest;
}

function sanitizeOutboxEvent(event: WorkoutSessionOutboxEvent): WorkoutSessionOutboxEvent {
  return {
    ...event,
    payload: stripLegacyNextState(event.payload),
  };
}

export function canUseWorkoutSessionOutbox(): boolean {
  return hasIDB();
}

export async function putWorkoutSessionOutboxEvent(
  event: WorkoutSessionOutboxEvent,
): Promise<void> {
  const sanitized = sanitizeOutboxEvent(event);
  if (!hasIDB()) {
    const index = memoryOutbox.findIndex((item) => item.id === sanitized.id);
    if (index >= 0) memoryOutbox[index] = sanitized;
    else memoryOutbox.push(sanitized);
    return;
  }
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(sanitized);
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
      req.onsuccess = () => resolve(normalizedOutboxEvent(req.result));
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
    memoryOutbox[index] = sanitizeOutboxEvent({ ...memoryOutbox[index], ...patch });
    return memoryOutbox[index];
  }
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const updated = await new Promise<WorkoutSessionOutboxEvent | null>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const current = normalizedOutboxEvent(req.result);
        if (!current) {
          resolve(null);
          return;
        }
        const next = sanitizeOutboxEvent({ ...current, ...patch });
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
        const all = ((req.result as unknown[]) ?? [])
          .map(normalizedOutboxEvent)
          .filter((event): event is WorkoutSessionOutboxEvent => event != null);
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
      req.onsuccess = () => resolve(((req.result as unknown[]) ?? [])
        .map(normalizedOutboxEvent)
        .filter((event): event is WorkoutSessionOutboxEvent => event != null));
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
      req.onsuccess = () => resolve(((req.result as unknown[]) ?? [])
        .map(normalizedOutboxEvent)
        .filter((event): event is WorkoutSessionOutboxEvent => event != null));
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
