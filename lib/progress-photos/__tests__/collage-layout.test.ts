import { describe, expect, it } from "vitest";

import {
  FOOTER_HEIGHT,
  PANEL_HEIGHT,
  PANEL_WIDTH,
  computeCollageLayout,
  coverCrop,
} from "@/lib/progress-photos/collage";

describe("coverCrop", () => {
  it("uses the full source when aspect ratios match", () => {
    const p = coverCrop({ width: 900, height: 1200 }, PANEL_WIDTH, PANEL_HEIGHT, 0, 0);
    expect(p).toEqual({
      sx: 0,
      sy: 0,
      sw: 900,
      sh: 1200,
      dx: 0,
      dy: 0,
      dw: PANEL_WIDTH,
      dh: PANEL_HEIGHT,
    });
  });

  it("crops the sides of a too-wide (landscape) source", () => {
    const p = coverCrop({ width: 2400, height: 1200 }, PANEL_WIDTH, PANEL_HEIGHT, 0, 0);
    // Scale is bound by height: 1200/1200 = 1 → crop width to 900.
    expect(p.sh).toBe(1200);
    expect(p.sy).toBe(0);
    expect(p.sw).toBe(900);
    expect(p.sx).toBe((2400 - 900) / 2);
  });

  it("crops the top/bottom of a too-tall (portrait) source", () => {
    const p = coverCrop({ width: 900, height: 2400 }, PANEL_WIDTH, PANEL_HEIGHT, 0, 0);
    expect(p.sw).toBe(900);
    expect(p.sx).toBe(0);
    expect(p.sh).toBe(1200);
    expect(p.sy).toBe((2400 - 1200) / 2);
  });

  it("upscales a small source while keeping the cover crop centered", () => {
    const p = coverCrop({ width: 300, height: 500 }, PANEL_WIDTH, PANEL_HEIGHT, 0, 0);
    // Scale bound by width: 900/300 = 3 → crop height to 1200/3 = 400.
    expect(p.sw).toBe(300);
    expect(p.sx).toBe(0);
    expect(p.sh).toBe(400);
    expect(p.sy).toBe(50);
  });
});

describe("computeCollageLayout", () => {
  it("produces a side-by-side canvas with a footer band", () => {
    const layout = computeCollageLayout(
      { width: 1000, height: 1500 },
      { width: 1536, height: 2048 },
    );
    expect(layout.width).toBe(PANEL_WIDTH * 2);
    expect(layout.height).toBe(PANEL_HEIGHT + FOOTER_HEIGHT);
    expect(layout.panels[0].dx).toBe(0);
    expect(layout.panels[1].dx).toBe(PANEL_WIDTH);
    expect(layout.footer).toEqual({ y: PANEL_HEIGHT, height: FOOTER_HEIGHT });
  });

  it("handles mismatched aspect ratios independently per panel", () => {
    const layout = computeCollageLayout(
      { width: 2000, height: 1000 }, // landscape
      { width: 1000, height: 2000 }, // portrait
    );
    // Landscape panel: height-bound, horizontal crop.
    expect(layout.panels[0].sx).toBeGreaterThan(0);
    expect(layout.panels[0].sy).toBe(0);
    // Portrait panel: width-bound, vertical crop.
    expect(layout.panels[1].sx).toBe(0);
    expect(layout.panels[1].sy).toBeGreaterThan(0);
  });
});
