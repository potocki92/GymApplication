import { create } from "zustand";

import {
  deleteProgressPhotoLocal,
  loadAllProgressPhotos,
  putProgressPhoto,
  replaceAllProgressPhotos,
} from "@/lib/idb-progress-photos";
import { processProgressImage } from "@/lib/progress-photos/image-pipeline";
import {
  newCountMilestone,
  type ProgressMilestone,
} from "@/lib/progress-photos/streak-utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  deleteProgressPhoto as deleteSupaPhoto,
  insertProgressPhoto,
  loadProgressPhotos,
  updateProgressPhotoMeta,
  type UpdateProgressPhotoPatch,
} from "@/lib/supabase-progress-photos";
import type {
  ProgressPhotoDraft,
  ProgressPhotoRecord,
  ProgressPose,
} from "@/types";
import { useAuthStore } from "./use-auth-store";

export type UploadPhase =
  | "idle"
  | "compressing"
  | "uploading"
  | "saving"
  | "done";

interface ProgressPhotosState {
  records: ProgressPhotoRecord[];
  hydrated: boolean;
  uploading: boolean;
  /**
   * Coarse upload phase. Supabase Storage `.upload()` exposes no byte-level
   * progress callback, so we surface honest discrete phases instead of a faked
   * continuous percentage.
   */
  uploadPhase: UploadPhase;
  /** 0–100, derived from `uploadPhase` — drives the determinate Progress bar. */
  uploadProgress: number;
  /** Set when an upload crosses a count milestone; consumed by the celebration. */
  celebrate: ProgressMilestone | null;
  dismissCelebration: () => void;
  hydrate: () => Promise<void>;
  rehydrate: () => Promise<void>;
  add: (draft: ProgressPhotoDraft, file: File) => Promise<ProgressPhotoRecord>;
  update: (
    id: string,
    patch: UpdateProgressPhotoPatch,
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

function activeUser() {
  if (!isSupabaseConfigured()) return null;
  return useAuthStore.getState().user;
}

async function loadInitial(): Promise<ProgressPhotoRecord[]> {
  const user = activeUser();
  if (user) {
    const remote = await loadProgressPhotos(user.id);
    // Mirror metadata to IDB so a momentary network drop still shows the gallery.
    void replaceAllProgressPhotos(remote);
    return remote;
  }
  return loadAllProgressPhotos();
}

function sortByTakenAtDesc(records: ProgressPhotoRecord[]): ProgressPhotoRecord[] {
  return [...records].sort((a, b) => {
    if (a.takenAt === b.takenAt) return b.createdAt - a.createdAt;
    return a.takenAt < b.takenAt ? 1 : -1;
  });
}

export const useProgressPhotosStore = create<ProgressPhotosState>((set, get) => ({
  records: [],
  hydrated: false,
  uploading: false,
  uploadPhase: "idle",
  uploadProgress: 0,
  celebrate: null,

  dismissCelebration: () => set({ celebrate: null }),

  hydrate: async () => {
    if (get().hydrated) return;
    const records = await loadInitial();
    set({ records: sortByTakenAtDesc(records), hydrated: true });
  },

  rehydrate: async () => {
    const records = await loadInitial();
    set({ records: sortByTakenAtDesc(records), hydrated: true });
  },

  add: async (draft, file) => {
    set({ uploading: true, uploadPhase: "compressing", uploadProgress: 10 });
    try {
      const user = activeUser();
      if (!user) {
        throw new Error("authRequired");
      }
      const processed = await processProgressImage(file);
      set({ uploadPhase: "uploading", uploadProgress: 55 });
      const record = await insertProgressPhoto({
        userId: user.id,
        draft,
        fullBlob: processed.full,
        thumbBlob: processed.thumb,
        width: processed.width,
        height: processed.height,
      });
      set({ uploadPhase: "saving", uploadProgress: 90 });
      const beforeTotal = get().records.length;
      const milestone = newCountMilestone(beforeTotal, beforeTotal + 1);
      set((s) => ({
        records: sortByTakenAtDesc([...s.records, record]),
        celebrate: milestone ?? s.celebrate,
      }));
      void putProgressPhoto(record);
      set({ uploadPhase: "done", uploadProgress: 100 });
      return record;
    } finally {
      set({ uploading: false, uploadPhase: "idle", uploadProgress: 0 });
    }
  },

  update: async (id, patch) => {
    const user = activeUser();
    if (!user) return;
    const updated = await updateProgressPhotoMeta(id, user.id, patch);
    if (!updated) return;
    set((s) => ({
      records: sortByTakenAtDesc(
        s.records.map((r) => (r.id === id ? updated : r)),
      ),
    }));
    void putProgressPhoto(updated);
  },

  remove: async (id) => {
    const record = get().records.find((r) => r.id === id);
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
    void deleteProgressPhotoLocal(id);
    const user = activeUser();
    if (user && record) {
      await deleteSupaPhoto(record, user.id);
    }
  },
}));

// ── Selectors ────────────────────────────────────────────────────────────────

export function selectPhotosByPose(
  records: ProgressPhotoRecord[],
  pose: ProgressPose,
): ProgressPhotoRecord[] {
  return records.filter((r) => r.pose === pose);
}

export function selectPhotosByMonth(
  records: ProgressPhotoRecord[],
): Map<string, ProgressPhotoRecord[]> {
  const out = new Map<string, ProgressPhotoRecord[]>();
  for (const r of records) {
    const key = r.takenAt.slice(0, 7); // YYYY-MM
    const bucket = out.get(key) ?? [];
    bucket.push(r);
    out.set(key, bucket);
  }
  return out;
}

/**
 * Returns the newest photo from each calendar month (most-recent month first),
 * filtered by pose. Used by the auto month-to-month comparison.
 */
export function selectLatestPerMonth(
  records: ProgressPhotoRecord[],
  pose: ProgressPose,
): ProgressPhotoRecord[] {
  const byMonth = new Map<string, ProgressPhotoRecord>();
  for (const r of records) {
    if (r.pose !== pose) continue;
    const key = r.takenAt.slice(0, 7);
    const existing = byMonth.get(key);
    if (!existing || existing.takenAt < r.takenAt) byMonth.set(key, r);
  }
  return Array.from(byMonth.values()).sort((a, b) =>
    a.takenAt < b.takenAt ? 1 : -1,
  );
}
