/**
 * Before–after collage export for progress photos.
 *
 * The layout math is pure (unit-testable); the canvas/share plumbing mirrors
 * the OffscreenCanvas-with-fallback pattern from `image-pipeline.ts`. Images
 * are fetched as bytes first (fetch → blob → createImageBitmap), so the canvas
 * is never CORS-tainted by the signed storage URLs.
 */

export interface Dimensions {
  width: number;
  height: number;
}

export interface PanelDraw {
  /** Source crop rect (cover-fit). */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Destination rect on the canvas. */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface CollageLayout {
  width: number;
  height: number;
  panels: [PanelDraw, PanelDraw];
  footer: { y: number; height: number };
}

export const PANEL_WIDTH = 900;
export const PANEL_HEIGHT = 1200;
export const FOOTER_HEIGHT = 150;

/**
 * Cover-fit crop: scales the source so it fills `dw × dh` completely and
 * crops the overflow symmetrically (like CSS `object-fit: cover`).
 */
export function coverCrop(
  src: Dimensions,
  dw: number,
  dh: number,
  dx: number,
  dy: number,
): PanelDraw {
  const scale = Math.max(dw / src.width, dh / src.height);
  const sw = dw / scale;
  const sh = dh / scale;
  return {
    sx: (src.width - sw) / 2,
    sy: (src.height - sh) / 2,
    sw,
    sh,
    dx,
    dy,
    dw,
    dh,
  };
}

export function computeCollageLayout(
  before: Dimensions,
  after: Dimensions,
): CollageLayout {
  const width = PANEL_WIDTH * 2;
  const height = PANEL_HEIGHT + FOOTER_HEIGHT;
  return {
    width,
    height,
    panels: [
      coverCrop(before, PANEL_WIDTH, PANEL_HEIGHT, 0, 0),
      coverCrop(after, PANEL_WIDTH, PANEL_HEIGHT, PANEL_WIDTH, 0),
    ],
    footer: { y: PANEL_HEIGHT, height: FOOTER_HEIGHT },
  };
}

export interface CollageInput {
  beforeUrl: string;
  afterUrl: string;
  /** e.g. "1 marca 2026" */
  beforeLabel: string;
  afterLabel: string;
  /** e.g. "Zmiana wagi: −4,5 kg" — omitted when weights are missing. */
  deltaLine?: string;
  /** App branding rendered bottom-right, e.g. "FitFlow". */
  brand: string;
}

async function fetchBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchFailed:${res.status}`);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

interface Canvas2d {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
}

function createCanvas(width: number, height: number): Canvas2d {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) return { canvas, ctx };
  }
  if (typeof document === "undefined") throw new Error("noCanvas2d");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("noCanvas2d");
  return { canvas, ctx };
}

async function encodeJpeg(canvas: Canvas2d["canvas"]): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encodeFailed"))),
      "image/jpeg",
      0.9,
    );
  });
}

/** Renders the side-by-side collage and returns it as a JPEG blob. */
export async function buildCollageBlob(input: CollageInput): Promise<Blob> {
  const [beforeBmp, afterBmp] = await Promise.all([
    fetchBitmap(input.beforeUrl),
    fetchBitmap(input.afterUrl),
  ]);

  try {
    const layout = computeCollageLayout(
      { width: beforeBmp.width, height: beforeBmp.height },
      { width: afterBmp.width, height: afterBmp.height },
    );
    const { canvas, ctx } = createCanvas(layout.width, layout.height);

    // Exported artwork uses fixed colors by design — it must look the same
    // regardless of the app theme.
    ctx.fillStyle = "#0c0a09";
    ctx.fillRect(0, 0, layout.width, layout.height);

    const bitmaps = [beforeBmp, afterBmp] as const;
    layout.panels.forEach((p, i) => {
      ctx.drawImage(bitmaps[i], p.sx, p.sy, p.sw, p.sh, p.dx, p.dy, p.dw, p.dh);
    });

    // Per-panel date labels on a subtle scrim at the bottom of each photo.
    const labels = [input.beforeLabel, input.afterLabel];
    ctx.textBaseline = "middle";
    layout.panels.forEach((p, i) => {
      const scrimH = 90;
      const gradient = ctx.createLinearGradient(
        0,
        p.dy + p.dh - scrimH,
        0,
        p.dy + p.dh,
      );
      gradient.addColorStop(0, "rgba(12, 10, 9, 0)");
      gradient.addColorStop(1, "rgba(12, 10, 9, 0.75)");
      ctx.fillStyle = gradient;
      ctx.fillRect(p.dx, p.dy + p.dh - scrimH, p.dw, scrimH);

      ctx.fillStyle = "#fafaf9";
      ctx.font = "600 36px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels[i], p.dx + p.dw / 2, p.dy + p.dh - 36);
    });

    // Footer: weight delta (left/center) + brand (right).
    const footerMidY = layout.footer.y + layout.footer.height / 2;
    if (input.deltaLine) {
      ctx.fillStyle = "#fafaf9";
      ctx.font = "600 44px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(input.deltaLine, 48, footerMidY);
    }
    ctx.fillStyle = "#a8a29e";
    ctx.font = "500 36px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(input.brand, layout.width - 48, footerMidY);

    return await encodeJpeg(canvas);
  } finally {
    beforeBmp.close?.();
    afterBmp.close?.();
  }
}

/**
 * Shares the blob via the Web Share API when file sharing is supported,
 * otherwise falls back to a regular download. A user-cancelled share resolves
 * as "shared" — it is not an error.
 */
export async function shareOrDownloadBlob(
  blob: Blob,
  filename: string,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: blob.type });
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "shared";
      }
      // Fall through to download on share failure.
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return "downloaded";
}
