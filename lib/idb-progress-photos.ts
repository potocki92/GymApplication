import type { ProgressPhotoRecord } from "@/types";

const DB_NAME = "fitflow-progress-photos";
const VERSION = 1;
const RECORDS = "records";
const THUMBS = "thumbs"; // Blob keyed by record id

function hasIDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RECORDS)) {
        db.createObjectStore(RECORDS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(THUMBS)) {
        db.createObjectStore(THUMBS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllProgressPhotos(): Promise<ProgressPhotoRecord[]> {
  if (!hasIDB()) return [];
  try {
    const db = await openDb();
    const result = await new Promise<ProgressPhotoRecord[]>((resolve, reject) => {
      const tx = db.transaction(RECORDS, "readonly");
      const req = tx.objectStore(RECORDS).getAll();
      req.onsuccess = () => resolve((req.result as ProgressPhotoRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return [];
  }
}

export async function putProgressPhoto(
  record: ProgressPhotoRecord,
): Promise<void> {
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

export async function deleteProgressPhotoLocal(id: string): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([RECORDS, THUMBS], "readwrite");
      tx.objectStore(RECORDS).delete(id);
      tx.objectStore(THUMBS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function replaceAllProgressPhotos(
  records: ProgressPhotoRecord[],
): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RECORDS, "readwrite");
      const store = tx.objectStore(RECORDS);
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const r of records) store.put(r);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function putThumb(id: string, blob: Blob): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(THUMBS, "readwrite");
      tx.objectStore(THUMBS).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function getThumb(id: string): Promise<Blob | null> {
  if (!hasIDB()) return null;
  try {
    const db = await openDb();
    const result = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(THUMBS, "readonly");
      const req = tx.objectStore(THUMBS).get(id);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}
