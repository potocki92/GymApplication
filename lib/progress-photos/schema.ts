import { z } from "zod";

import { PROGRESS_POSES } from "@/types";

/**
 * Hard pre-resize ceiling — files larger than this are rejected before we even
 * touch them. After client-side resize/re-encode to WebP the bytes that land
 * in Supabase Storage are typically 150-500 KB.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPastOrToday(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= today.getTime() && d.getFullYear() >= 1970;
}

export const progressPhotoDraftSchema = z.object({
  takenAt: z
    .string()
    .regex(ISO_DATE_RE, "format")
    .refine(isPastOrToday, "outOfRange"),
  pose: z.enum(PROGRESS_POSES),
  weightKg: z
    .number()
    .min(20, "weightRange")
    .max(400, "weightRange")
    .nullable(),
  notes: z
    .string()
    .max(500, "notesTooLong")
    .nullable(),
});

export type ProgressPhotoDraftInput = z.input<typeof progressPhotoDraftSchema>;
export type ProgressPhotoDraftParsed = z.output<typeof progressPhotoDraftSchema>;

/**
 * Reject anything that isn't an image and anything larger than MAX_UPLOAD_BYTES
 * *before* we attempt to decode it — bitmap decoders can be memory-hungry.
 */
export function validateUploadFile(file: File): { ok: true } | { ok: false; code: string } {
  if (!file.type.startsWith("image/")) return { ok: false, code: "mime" };
  // SVG can smuggle scripts even when type is image/svg+xml — we never accept it.
  if (file.type === "image/svg+xml") return { ok: false, code: "svgRejected" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, code: "tooLarge" };
  if (file.size <= 0) return { ok: false, code: "empty" };
  return { ok: true };
}
