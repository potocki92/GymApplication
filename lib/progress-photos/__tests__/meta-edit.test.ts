import { describe, expect, it } from "vitest";

import { buildMetaPatch, parseWeight } from "@/lib/progress-photos/meta-edit";
import type { ProgressPhotoRecord } from "@/types";

function record(overrides: Partial<ProgressPhotoRecord> = {}): ProgressPhotoRecord {
  return {
    id: "p1",
    takenAt: "2026-05-01",
    pose: "front",
    storagePath: "u1/p1.webp",
    thumbPath: "u1/p1.thumb.webp",
    weightKg: 82.5,
    notes: "rano",
    width: 1000,
    height: 1500,
    byteSize: 200_000,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("parseWeight", () => {
  it("parses dot and comma decimals", () => {
    expect(parseWeight("82.4")).toBe(82.4);
    expect(parseWeight("82,4")).toBe(82.4);
  });

  it("returns null for empty or garbage input", () => {
    expect(parseWeight("")).toBeNull();
    expect(parseWeight("   ")).toBeNull();
    expect(parseWeight("abc")).toBeNull();
  });
});

describe("buildMetaPatch", () => {
  it("returns an empty patch when nothing changed", () => {
    const r = record();
    const patch = buildMetaPatch(r, {
      takenAt: r.takenAt,
      pose: r.pose,
      weightKg: r.weightKg,
      notes: r.notes,
    });
    expect(patch).toEqual({});
  });

  it("includes only changed fields", () => {
    const r = record();
    const patch = buildMetaPatch(r, {
      takenAt: "2026-05-02",
      pose: r.pose,
      weightKg: r.weightKg,
      notes: r.notes,
    });
    expect(patch).toEqual({ takenAt: "2026-05-02" });
  });

  it("emits weightKg null when the weight is cleared", () => {
    const r = record();
    const patch = buildMetaPatch(r, {
      takenAt: r.takenAt,
      pose: r.pose,
      weightKg: null,
      notes: r.notes,
    });
    expect(patch).toEqual({ weightKg: null });
  });

  it("includes a pose change", () => {
    const r = record();
    const patch = buildMetaPatch(r, {
      takenAt: r.takenAt,
      pose: "back",
      weightKg: r.weightKg,
      notes: r.notes,
    });
    expect(patch).toEqual({ pose: "back" });
  });
});
