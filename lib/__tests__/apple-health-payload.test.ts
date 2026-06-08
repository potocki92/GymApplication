import { describe, expect, it } from "vitest";

import { normalizeIngestPayload } from "@/lib/apple-health/payload";

describe("normalizeIngestPayload", () => {
  it("accepts the documented payload shape and fills default units", () => {
    const result = normalizeIngestPayload({
      samples: [
        { metric: "steps", value: 8432, start: "2026-06-03" },
        { metric: "active_energy_kcal", value: 540, start: "2026-06-03", unit: "kcal" },
        { metric: "resting_heart_rate", value: 58, start: "2026-06-03T08:00:00Z" },
      ],
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      metric: "steps",
      value: 8432,
      unit: "count",
      source: "apple_health",
    });
    expect(result[0].startTime).toBe(new Date("2026-06-03").toISOString());
    expect(result[2].unit).toBe("bpm");
  });

  it("accepts a bare array as well as { samples }", () => {
    const result = normalizeIngestPayload([
      { metric: "steps", value: 10, start: "2026-06-03" },
    ]);
    expect(result).toHaveLength(1);
  });

  it("coerces numeric strings and parses datetime aliases", () => {
    const result = normalizeIngestPayload({
      samples: [{ metric: "steps", value: "1200", startTime: "2026-06-03T10:00:00Z" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(1200);
    expect(result[0].startTime).toBe(new Date("2026-06-03T10:00:00Z").toISOString());
  });

  it("drops unknown metrics", () => {
    const result = normalizeIngestPayload({
      samples: [{ metric: "blood_glucose", value: 90, start: "2026-06-03" }],
    });
    expect(result).toHaveLength(0);
  });

  it("drops samples with non-numeric value or unparseable date", () => {
    const result = normalizeIngestPayload({
      samples: [
        { metric: "steps", value: "abc", start: "2026-06-03" },
        { metric: "steps", value: 100, start: "not-a-date" },
        { metric: "steps", start: "2026-06-03" },
      ],
    });
    expect(result).toHaveLength(0);
  });

  it("rejects heart rate outside the physiological range", () => {
    const result = normalizeIngestPayload({
      samples: [
        { metric: "resting_heart_rate", value: 10, start: "2026-06-03" },
        { metric: "avg_heart_rate", value: 300, start: "2026-06-03" },
        { metric: "resting_heart_rate", value: 58, start: "2026-06-03" },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(58);
  });

  it("rejects negative step/energy counts", () => {
    const result = normalizeIngestPayload({
      samples: [{ metric: "steps", value: -5, start: "2026-06-03" }],
    });
    expect(result).toHaveLength(0);
  });

  it("parses { samples } sent as a newline-joined string (iOS Shortcuts)", () => {
    const samples = [
      '{"metric":"steps","value":17283,"unit":"count","start":"2026-06-01"}',
      '{"metric":"steps","value":13840,"unit":"count","start":"2026-06-02"}',
      '{"metric":"steps","value":1895,"unit":"count","start":"2026-06-07"}',
    ].join("\n");

    const result = normalizeIngestPayload({ samples });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ metric: "steps", value: 17283, unit: "count" });
    expect(result[0].startTime).toBe(new Date("2026-06-01").toISOString());
  });

  it("parses { samples } sent as a stringified JSON array", () => {
    const samples = JSON.stringify([
      { metric: "steps", value: 500, start: "2026-06-03" },
    ]);
    const result = normalizeIngestPayload({ samples });
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(500);
  });

  it("returns an empty array for malformed input", () => {
    expect(normalizeIngestPayload(null)).toEqual([]);
    expect(normalizeIngestPayload({})).toEqual([]);
    expect(normalizeIngestPayload("nope")).toEqual([]);
  });
});
