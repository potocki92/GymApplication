import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FULL_MAX_EDGE,
  THUMB_MAX_EDGE,
  ImagePipelineError,
  processProgressImage,
} from "@/lib/progress-photos/image-pipeline";

type MockBitmap = { width: number; height: number; close: () => void };

const captures: Array<{ width: number; height: number; type: string }> = [];

function mockBitmap(width: number, height: number): MockBitmap {
  return { width, height, close: () => {} };
}

function installPipelineMocks(srcWidth: number, srcHeight: number) {
  captures.length = 0;

  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => mockBitmap(srcWidth, srcHeight)),
  );

  class MockOffscreenCanvas {
    constructor(public width: number, public height: number) {}
    getContext(kind: string) {
      if (kind !== "2d") return null;
      return { drawImage: () => {} };
    }
    async convertToBlob(opts: { type: string; quality?: number }) {
      captures.push({ width: this.width, height: this.height, type: opts.type });
      return new Blob(["x".repeat(64)], { type: opts.type });
    }
  }
  vi.stubGlobal("OffscreenCanvas", MockOffscreenCanvas);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("processProgressImage", () => {
  it("downscales the long edge to FULL_MAX_EDGE and THUMB_MAX_EDGE while preserving aspect ratio", async () => {
    installPipelineMocks(4000, 3000); // landscape, longer than both caps
    const file = new File([new Uint8Array(8)], "x.jpg", { type: "image/jpeg" });

    const result = await processProgressImage(file);

    const full = captures.find((c) => c.width === FULL_MAX_EDGE);
    const thumb = captures.find((c) => c.width === THUMB_MAX_EDGE);
    expect(full).toBeDefined();
    expect(thumb).toBeDefined();
    // 4000:3000 aspect = 4:3 → at width=2048, height=1536; at width=400, height=300.
    expect(full?.height).toBe(1536);
    expect(thumb?.height).toBe(300);
    expect(full?.type).toBe("image/webp");
    expect(thumb?.type).toBe("image/webp");

    expect(result.width).toBe(FULL_MAX_EDGE);
    expect(result.height).toBe(1536);
    expect(result.full).toBeInstanceOf(Blob);
    expect(result.thumb).toBeInstanceOf(Blob);
  });

  it("keeps small images at their native size", async () => {
    installPipelineMocks(300, 200); // smaller than thumb cap
    const file = new File([new Uint8Array(8)], "x.jpg", { type: "image/jpeg" });

    const result = await processProgressImage(file);

    expect(result.width).toBe(300);
    expect(result.height).toBe(200);
    // Both outputs at native size when smaller than the respective cap.
    expect(captures.every((c) => c.width === 300 && c.height === 200)).toBe(true);
  });

  it("handles portrait orientation by capping height, not width", async () => {
    installPipelineMocks(1500, 4500); // portrait, long edge = 4500
    const file = new File([new Uint8Array(8)], "x.jpg", { type: "image/jpeg" });

    const result = await processProgressImage(file);

    // long edge 4500 → at FULL cap 2048, scale = 2048/4500; width = 1500*scale ≈ 683
    expect(result.height).toBe(FULL_MAX_EDGE);
    expect(result.width).toBe(Math.round(1500 * (FULL_MAX_EDGE / 4500)));
  });

  it("throws ImagePipelineError when createImageBitmap fails", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("kaboom");
      }),
    );
    const file = new File([new Uint8Array(8)], "x.jpg", { type: "image/jpeg" });
    await expect(processProgressImage(file)).rejects.toBeInstanceOf(
      ImagePipelineError,
    );
  });
});
