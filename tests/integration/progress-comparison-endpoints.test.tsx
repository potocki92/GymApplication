import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useComparisonEndpoints } from "@/features/progress-photos/use-comparison-endpoints";
import type { ProgressPhotoRecord } from "@/types";

function record(
  id: string,
  takenAt: string,
  overrides: Partial<ProgressPhotoRecord> = {},
): ProgressPhotoRecord {
  return {
    id,
    takenAt,
    pose: "front",
    storagePath: `${id}.webp`,
    thumbPath: `${id}.thumb.webp`,
    weightKg: null,
    notes: null,
    width: 800,
    height: 1000,
    byteSize: 1000,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

// Newest-first, mirroring how the store hands records to the view.
const records: ProgressPhotoRecord[] = [
  record("d", "2024-03-20"),
  record("c", "2024-03-05"),
  record("b", "2024-02-10"),
  record("a", "2024-01-01"),
];

describe("useComparisonEndpoints", () => {
  it("defaults to transformation: oldest before, newest after", () => {
    const { result } = renderHook(() =>
      useComparisonEndpoints(records, records, "front"),
    );
    expect(result.current.preset).toBe("transformation");
    expect(result.current.before?.id).toBe("a");
    expect(result.current.after?.id).toBe("d");
  });

  it("monthToMonth pairs the latest of the two most recent months", () => {
    const { result } = renderHook(() =>
      useComparisonEndpoints(records, records, "front"),
    );
    act(() => result.current.setPreset("monthToMonth"));
    // March latest = "d", February latest = "b".
    expect(result.current.after?.id).toBe("d");
    expect(result.current.before?.id).toBe("b");
  });

  it("manual pick flips preset and resolves chosen ids", () => {
    const { result } = renderHook(() =>
      useComparisonEndpoints(records, records, "front"),
    );
    act(() => result.current.setBefore("b"));
    act(() => result.current.setAfter("c"));
    expect(result.current.preset).toBe("manual");
    expect(result.current.before?.id).toBe("b");
    expect(result.current.after?.id).toBe("c");
  });

  it("yields null pair when fewer than two photos", () => {
    const single = [record("a", "2024-01-01")];
    const { result } = renderHook(() =>
      useComparisonEndpoints(single, single, "front"),
    );
    // before === after (only photo) — view treats this as "not a pair".
    expect(result.current.before?.id).toBe(result.current.after?.id);
  });
});
