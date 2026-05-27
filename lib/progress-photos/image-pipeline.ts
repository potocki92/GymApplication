/**
 * Client-side image processing pipeline for progress photos.
 *
 * Pipeline:
 *   1. Decode via `createImageBitmap` with `imageOrientation: "from-image"` so
 *      that EXIF orientation is baked into the pixel data and we don't have to
 *      preserve EXIF metadata at all.
 *   2. Downscale to a long-edge cap, re-encoding to WebP. Re-encoding through
 *      a canvas drops every metadata block from the source (EXIF, GPS, ICC,
 *      XMP, IPTC, APPn comments), so the bytes that hit Supabase Storage
 *      contain only image data.
 *   3. Emit two outputs: `full` (display) and `thumb` (gallery).
 *
 * No third-party deps — we use OffscreenCanvas where available with a
 * <canvas> fallback for Safari versions that don't ship convertToBlob.
 */

export const FULL_MAX_EDGE = 2048;
export const FULL_QUALITY = 0.85;
export const THUMB_MAX_EDGE = 400;
export const THUMB_QUALITY = 0.78;

export interface ProcessedImage {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

export class ImagePipelineError extends Error {
  constructor(public readonly code: string, message?: string) {
    super(message ?? code);
    this.name = "ImagePipelineError";
  }
}

function pickDimensions(
  srcWidth: number,
  srcHeight: number,
  maxEdge: number,
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    throw new ImagePipelineError("invalidDimensions");
  }
  const longest = Math.max(srcWidth, srcHeight);
  if (longest <= maxEdge) {
    return { width: srcWidth, height: srcHeight };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(srcWidth * scale)),
    height: Math.max(1, Math.round(srcHeight * scale)),
  };
}

async function bitmapFromFile(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== "function") {
    throw new ImagePipelineError("noBitmapApi");
  }
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (err) {
    throw new ImagePipelineError(
      "decodeFailed",
      err instanceof Error ? err.message : "decode failed",
    );
  }
}

async function bitmapToWebp(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  // Prefer OffscreenCanvas — faster, doesn't touch the DOM.
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImagePipelineError("noCanvas2d");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await canvas.convertToBlob({ type: "image/webp", quality });
  }

  if (typeof document === "undefined") {
    throw new ImagePipelineError("noCanvas2d");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImagePipelineError("noCanvas2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new ImagePipelineError("encodeFailed"));
      },
      "image/webp",
      quality,
    );
  });
}

/**
 * Decode → downscale → re-encode to WebP twice (full + thumb). Returns Blobs
 * suitable for `supabase.storage.upload()`. The pipeline is intentionally
 * idempotent: calling it twice on the same file produces equivalent output.
 */
export async function processProgressImage(file: File): Promise<ProcessedImage> {
  const bitmap = await bitmapFromFile(file);
  try {
    const full = pickDimensions(bitmap.width, bitmap.height, FULL_MAX_EDGE);
    const thumb = pickDimensions(bitmap.width, bitmap.height, THUMB_MAX_EDGE);
    const [fullBlob, thumbBlob] = await Promise.all([
      bitmapToWebp(bitmap, full.width, full.height, FULL_QUALITY),
      bitmapToWebp(bitmap, thumb.width, thumb.height, THUMB_QUALITY),
    ]);
    return {
      full: fullBlob,
      thumb: thumbBlob,
      width: full.width,
      height: full.height,
    };
  } finally {
    if ("close" in bitmap && typeof bitmap.close === "function") {
      bitmap.close();
    }
  }
}
