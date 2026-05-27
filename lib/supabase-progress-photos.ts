import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  ProgressPhotoDraft,
  ProgressPhotoRecord,
} from "@/types";

const BUCKET = "progress-photos";

interface ProgressPhotoRow {
  id: string;
  user_id: string;
  taken_at: string;
  pose: "front" | "side" | "back";
  storage_path: string;
  thumb_path: string;
  weight_kg: number | string | null;
  notes: string | null;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  created_at: string;
  updated_at: string;
}

function num(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: ProgressPhotoRow): ProgressPhotoRecord {
  return {
    id: row.id,
    takenAt: row.taken_at,
    pose: row.pose,
    storagePath: row.storage_path,
    thumbPath: row.thumb_path,
    weightKg: num(row.weight_kg),
    notes: row.notes,
    width: row.width,
    height: row.height,
    byteSize: row.byte_size,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function getClient(): SupabaseClient | null {
  return getSupabaseClient();
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Best-effort fallback — Supabase will assign one server-side if we don't.
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function buildStoragePaths(userId: string, photoId: string): {
  fullPath: string;
  thumbPath: string;
} {
  return {
    fullPath: `${userId}/${photoId}.webp`,
    thumbPath: `${userId}/${photoId}.thumb.webp`,
  };
}

export async function loadProgressPhotos(
  userId: string,
): Promise<ProgressPhotoRecord[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false });
  if (error || !data) return [];
  return (data as ProgressPhotoRow[]).map(mapRow);
}

export interface UploadProgressPhotoInput {
  userId: string;
  draft: ProgressPhotoDraft;
  fullBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
}

/**
 * Two-phase upload: storage first (full + thumb), then DB insert. If the DB
 * write fails we roll back the storage objects so we never leak orphan files.
 */
export async function insertProgressPhoto({
  userId,
  draft,
  fullBlob,
  thumbBlob,
  width,
  height,
}: UploadProgressPhotoInput): Promise<ProgressPhotoRecord> {
  const supabase = getClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const id = uid();
  const { fullPath, thumbPath } = buildStoragePaths(userId, id);

  const uploadFull = await supabase.storage
    .from(BUCKET)
    .upload(fullPath, fullBlob, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadFull.error) throw new Error(uploadFull.error.message);

  const uploadThumb = await supabase.storage
    .from(BUCKET)
    .upload(thumbPath, thumbBlob, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadThumb.error) {
    await supabase.storage.from(BUCKET).remove([fullPath]);
    throw new Error(uploadThumb.error.message);
  }

  const row = {
    id,
    user_id: userId,
    taken_at: draft.takenAt,
    pose: draft.pose,
    storage_path: fullPath,
    thumb_path: thumbPath,
    weight_kg: draft.weightKg,
    notes: draft.notes,
    width,
    height,
    byte_size: fullBlob.size,
  };

  const { data, error } = await supabase
    .from("progress_photos")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([fullPath, thumbPath]);
    throw new Error(error?.message ?? "Failed to save photo");
  }
  return mapRow(data as ProgressPhotoRow);
}

export async function deleteProgressPhoto(
  record: ProgressPhotoRecord,
  userId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  // Storage cleanup is best-effort; the row delete is the source of truth.
  await supabase.storage
    .from(BUCKET)
    .remove([record.storagePath, record.thumbPath]);
  const { error } = await supabase
    .from("progress_photos")
    .delete()
    .eq("id", record.id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export interface UpdateProgressPhotoPatch {
  takenAt?: string;
  weightKg?: number | null;
  notes?: string | null;
}

export async function updateProgressPhotoMeta(
  id: string,
  userId: string,
  patch: UpdateProgressPhotoPatch,
): Promise<ProgressPhotoRecord | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const row: Record<string, unknown> = {};
  if (patch.takenAt !== undefined) row.taken_at = patch.takenAt;
  if (patch.weightKg !== undefined) row.weight_kg = patch.weightKg;
  if (patch.notes !== undefined) row.notes = patch.notes;
  const { data, error } = await supabase
    .from("progress_photos")
    .update(row)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as ProgressPhotoRow);
}

export async function getSignedPhotoUrl(
  path: string,
  ttlSec = 3600,
): Promise<string | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, ttlSec);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function getSignedPhotoUrls(
  paths: string[],
  ttlSec = 3600,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;
  const supabase = getClient();
  if (!supabase) return result;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, ttlSec);
  if (error || !data) return result;
  for (const item of data) {
    if (item.signedUrl && item.path) result.set(item.path, item.signedUrl);
  }
  return result;
}

export async function downloadThumb(path: string): Promise<Blob | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return data;
}
