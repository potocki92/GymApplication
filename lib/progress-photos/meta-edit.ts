import type { UpdateProgressPhotoPatch } from "@/lib/supabase-progress-photos";
import type { ProgressPhotoRecord, ProgressPose } from "@/types";

/**
 * Parses a human-entered weight string ("82,4" / "82.4" / "") into kilograms.
 * Empty input means "no weight" (null); unparseable input also yields null so
 * the Zod schema decides whether that's acceptable.
 */
export function parseWeight(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export interface MetaEditValues {
  takenAt: string;
  pose: ProgressPose;
  weightKg: number | null;
  notes: string | null;
}

/**
 * Diffs edited form values against the stored record and returns a patch
 * containing only the fields that actually changed. An empty object means
 * there is nothing to persist.
 */
export function buildMetaPatch(
  record: ProgressPhotoRecord,
  values: MetaEditValues,
): UpdateProgressPhotoPatch {
  const patch: UpdateProgressPhotoPatch = {};
  if (values.takenAt !== record.takenAt) patch.takenAt = values.takenAt;
  if (values.pose !== record.pose) patch.pose = values.pose;
  if (values.weightKg !== record.weightKg) patch.weightKg = values.weightKg;
  if (values.notes !== record.notes) patch.notes = values.notes;
  return patch;
}
