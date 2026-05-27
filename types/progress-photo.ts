export const PROGRESS_PHOTO_SCHEMA_VERSION = 1 as const;

export type ProgressPose = "front" | "side" | "back";

export const PROGRESS_POSES = ["front", "side", "back"] as const;

/**
 * One uploaded body-progress photo. The actual image bytes live in Supabase
 * Storage at `storagePath` (full size) and `thumbPath` (small thumbnail);
 * both are private and only accessible via short-lived signed URLs.
 */
export interface ProgressPhotoRecord {
  id: string;
  takenAt: string; // YYYY-MM-DD
  pose: ProgressPose;
  storagePath: string;
  thumbPath: string;
  weightKg: number | null;
  notes: string | null;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

/** What the user supplies in the upload form — id/paths are assigned by the upload pipeline. */
export interface ProgressPhotoDraft {
  takenAt: string;
  pose: ProgressPose;
  weightKg: number | null;
  notes: string | null;
}
