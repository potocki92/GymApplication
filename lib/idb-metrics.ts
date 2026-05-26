import type { BodyMetricGoal, BodyMetricRecord } from "@/types";

const DB_NAME = "fitflow-metrics";
const RECORDS = "records";
const META = "meta";
const GOAL_KEY = "goal";

function hasIDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RECORDS)) {
        db.createObjectStore(RECORDS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllMetrics(): Promise<BodyMetricRecord[]> {
  if (!hasIDB()) return [];
  try {
    const db = await openDb();
    const result = await new Promise<BodyMetricRecord[]>((resolve, reject) => {
      const tx = db.transaction(RECORDS, "readonly");
      const req = tx.objectStore(RECORDS).getAll();
      req.onsuccess = () => resolve((req.result as BodyMetricRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return [];
  }
}

export async function putMetric(record: BodyMetricRecord): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RECORDS, "readwrite");
      tx.objectStore(RECORDS).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* best effort */
  }
}

export async function deleteMetric(id: string): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RECORDS, "readwrite");
      tx.objectStore(RECORDS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function loadGoal(): Promise<BodyMetricGoal | null> {
  if (!hasIDB()) return null;
  try {
    const db = await openDb();
    const result = await new Promise<BodyMetricGoal | null>((resolve, reject) => {
      const tx = db.transaction(META, "readonly");
      const req = tx.objectStore(META).get(GOAL_KEY);
      req.onsuccess = () => resolve((req.result as BodyMetricGoal) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function saveGoal(goal: BodyMetricGoal | null): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META, "readwrite");
      const store = tx.objectStore(META);
      if (goal == null) store.delete(GOAL_KEY);
      else store.put(goal, GOAL_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}
