import { beforeEach, describe, expect, it } from "vitest";

import {
  clearDashboardCache,
  DASHBOARD_CACHE_TTL_MS,
  isDashboardCacheFresh,
  readDashboardCache,
  readDashboardCacheEntry,
  writeDashboardCache,
} from "@/lib/dashboard-cache";

const NOW = 1_000_000;

beforeEach(() => {
  window.localStorage.clear();
});

describe("dashboard cache", () => {
  it("reads a freshly written profile cache entry", () => {
    writeDashboardCache("profile", "u-1", { displayName: "Adam" }, NOW);

    expect(readDashboardCache("profile", "u-1", NOW)).toEqual({
      displayName: "Adam",
    });
  });

  it("keeps entries separated by user id", () => {
    writeDashboardCache("profile", "u-1", { displayName: "Adam" }, NOW);
    writeDashboardCache("profile", "u-2", { displayName: "Ewa" }, NOW);

    expect(readDashboardCache("profile", "u-1", NOW)).toEqual({
      displayName: "Adam",
    });
    expect(readDashboardCache("profile", "u-2", NOW)).toEqual({
      displayName: "Ewa",
    });
  });

  it("keeps entries separated by dashboard scope", () => {
    writeDashboardCache("profile", "u-1", { displayName: "Adam" }, NOW);
    writeDashboardCache("plan", "u-1", { id: "plan-1" }, NOW);

    expect(readDashboardCache("profile", "u-1", NOW)).toEqual({
      displayName: "Adam",
    });
    expect(readDashboardCache("plan", "u-1", NOW)).toEqual({ id: "plan-1" });
  });

  it("returns null when an entry is missing", () => {
    expect(readDashboardCache("sessions", "missing", NOW)).toBeNull();
  });

  it("returns null for stale entries", () => {
    writeDashboardCache("plan", "u-1", { id: "plan-1" }, NOW);

    expect(
      readDashboardCache("plan", "u-1", NOW + DASHBOARD_CACHE_TTL_MS),
    ).toBeNull();
  });

  it("returns fresh entries just before the ttl boundary", () => {
    writeDashboardCache("plan", "u-1", { id: "plan-1" }, NOW);

    expect(
      readDashboardCache("plan", "u-1", NOW + DASHBOARD_CACHE_TTL_MS - 1),
    ).toEqual({ id: "plan-1" });
  });

  it("supports a custom ttl for short-lived validation", () => {
    writeDashboardCache("metrics", "u-1", { records: [] }, NOW);

    expect(readDashboardCache("metrics", "u-1", NOW + 50, 100)).toEqual({
      records: [],
    });
    expect(readDashboardCache("metrics", "u-1", NOW + 100, 100)).toBeNull();
  });

  it("treats future timestamps as invalid", () => {
    expect(isDashboardCacheFresh(NOW + 1, NOW)).toBe(false);
  });

  it("treats timestamps at now as fresh", () => {
    expect(isDashboardCacheFresh(NOW, NOW)).toBe(true);
  });

  it("treats timestamps older than ttl as stale", () => {
    expect(isDashboardCacheFresh(NOW - DASHBOARD_CACHE_TTL_MS, NOW)).toBe(
      false,
    );
  });

  it("treats timestamps inside ttl as fresh", () => {
    expect(isDashboardCacheFresh(NOW - DASHBOARD_CACHE_TTL_MS + 1, NOW)).toBe(
      true,
    );
  });

  it("clears only the selected scope for a user", () => {
    writeDashboardCache("profile", "u-1", { displayName: "Adam" }, NOW);
    writeDashboardCache("plan", "u-1", { id: "plan-1" }, NOW);

    clearDashboardCache("profile", "u-1");

    expect(readDashboardCache("profile", "u-1", NOW)).toBeNull();
    expect(readDashboardCache("plan", "u-1", NOW)).toEqual({ id: "plan-1" });
  });

  it("clears only the selected user", () => {
    writeDashboardCache("profile", "u-1", { displayName: "Adam" }, NOW);
    writeDashboardCache("profile", "u-2", { displayName: "Ewa" }, NOW);

    clearDashboardCache("profile", "u-1");

    expect(readDashboardCache("profile", "u-1", NOW)).toBeNull();
    expect(readDashboardCache("profile", "u-2", NOW)).toEqual({
      displayName: "Ewa",
    });
  });

  it("overwrites an existing entry with newer data", () => {
    writeDashboardCache("profile", "u-1", { displayName: "Adam" }, NOW);
    writeDashboardCache("profile", "u-1", { displayName: "Adam Nowy" }, NOW + 1);

    expect(readDashboardCache("profile", "u-1", NOW + 1)).toEqual({
      displayName: "Adam Nowy",
    });
  });

  it("returns null for corrupted json", () => {
    window.localStorage.setItem("fitflow-dashboard-cache:profile:u-1", "{");

    expect(readDashboardCache("profile", "u-1", NOW)).toBeNull();
  });

  it("returns null for unsupported cache version", () => {
    window.localStorage.setItem(
      "fitflow-dashboard-cache:profile:u-1",
      JSON.stringify({ version: 999, savedAt: NOW, data: { displayName: "X" } }),
    );

    expect(readDashboardCache("profile", "u-1", NOW)).toBeNull();
  });

  it("returns null when savedAt is missing", () => {
    window.localStorage.setItem(
      "fitflow-dashboard-cache:profile:u-1",
      JSON.stringify({ version: 1, data: { displayName: "X" } }),
    );

    expect(readDashboardCache("profile", "u-1", NOW)).toBeNull();
  });

  it("returns null when savedAt is not finite", () => {
    window.localStorage.setItem(
      "fitflow-dashboard-cache:profile:u-1",
      JSON.stringify({ version: 1, savedAt: Number.POSITIVE_INFINITY, data: {} }),
    );

    expect(readDashboardCache("profile", "u-1", NOW)).toBeNull();
  });

  it("handles user ids that require url encoding", () => {
    writeDashboardCache("profile", "user+test@example.com", { ok: true }, NOW);

    expect(readDashboardCache("profile", "user+test@example.com", NOW)).toEqual({
      ok: true,
    });
  });

  it("stores empty arrays as valid fresh data", () => {
    writeDashboardCache("sessions", "u-1", [], NOW);

    expect(readDashboardCache("sessions", "u-1", NOW)).toEqual([]);
  });

  it("can distinguish a cached null profile from a cache miss", () => {
    writeDashboardCache("profile", "u-1", null, NOW);

    expect(readDashboardCache("profile", "u-1", NOW)).toBeNull();
    expect(readDashboardCacheEntry("profile", "u-1", NOW)).toEqual({
      data: null,
      savedAt: NOW,
    });
  });
});
