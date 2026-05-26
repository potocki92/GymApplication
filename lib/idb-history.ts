import type { ExerciseHistoryRecord } from "@/types";

const DB_NAME = "fitflow-history";
const STORE = "records";

function hasIDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Read every history record. The dataset is small (~hundreds), in-memory ops are fine. */
export async function loadAllHistory(): Promise<ExerciseHistoryRecord[]> {
  if (!hasIDB()) return [];
  try {
    const db = await openDb();
    const result = await new Promise<ExerciseHistoryRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as ExerciseHistoryRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return [];
  }
}

export async function appendHistory(
  records: ExerciseHistoryRecord[],
): Promise<void> {
  if (!hasIDB() || records.length === 0) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const r of records) store.put(r);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* best effort */
  }
}

export async function clearAllHistory(): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}
