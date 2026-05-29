import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WeeklyPlan } from "@/types";

const mocks = vi.hoisted(() => ({
  loadPlanFromSupabase: vi.fn<() => Promise<WeeklyPlan>>(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/supabase-plan", () => ({
  loadPlanFromSupabase: mocks.loadPlanFromSupabase,
  removeWorkoutFromSupabase: vi.fn(),
  setCompletedInSupabase: vi.fn(),
  setRestInSupabase: vi.fn(),
  upsertWorkoutToSupabase: vi.fn(),
}));

import { DASHBOARD_CACHE_TTL_MS, writeDashboardCache } from "@/lib/dashboard-cache";
import { useAuthStore } from "@/store/use-auth-store";
import { usePlanStore } from "@/store/use-plan-store";

const USER = { id: "user-cache" } as User;

const CACHED_PLAN: WeeklyPlan = {
  id: "cached-plan",
  weekStart: "2026-05-25",
  days: [
    { weekday: "monday", rest: true },
    { weekday: "tuesday", rest: true },
    { weekday: "wednesday", rest: true },
    { weekday: "thursday", rest: true },
    { weekday: "friday", rest: true },
    { weekday: "saturday", rest: true },
    { weekday: "sunday", rest: true },
  ],
};

const REMOTE_PLAN: WeeklyPlan = {
  ...CACHED_PLAN,
  id: "remote-plan",
};

beforeEach(() => {
  window.localStorage.clear();
  mocks.loadPlanFromSupabase.mockReset();
  useAuthStore.setState({ user: USER, initialized: true });
  usePlanStore.setState({ hydrated: false });
});

describe("usePlanStore dashboard cache", () => {
  it("hydrates from a fresh dashboard cache without hitting Supabase", async () => {
    writeDashboardCache("plan", USER.id, CACHED_PLAN);

    await usePlanStore.getState().hydrate();

    expect(usePlanStore.getState().plan.id).toBe("cached-plan");
    expect(mocks.loadPlanFromSupabase).not.toHaveBeenCalled();
  });

  it("falls back to Supabase when the dashboard cache is stale", async () => {
    writeDashboardCache(
      "plan",
      USER.id,
      CACHED_PLAN,
      Date.now() - DASHBOARD_CACHE_TTL_MS,
    );
    mocks.loadPlanFromSupabase.mockResolvedValueOnce(REMOTE_PLAN);

    await usePlanStore.getState().hydrate();

    expect(usePlanStore.getState().plan.id).toBe("remote-plan");
    expect(mocks.loadPlanFromSupabase).toHaveBeenCalledWith(USER.id);
  });

  it("reuses the refreshed cache after a Supabase load", async () => {
    mocks.loadPlanFromSupabase.mockResolvedValueOnce(REMOTE_PLAN);

    await usePlanStore.getState().hydrate();
    usePlanStore.setState({ hydrated: false });
    await usePlanStore.getState().hydrate();

    expect(usePlanStore.getState().plan.id).toBe("remote-plan");
    expect(mocks.loadPlanFromSupabase).toHaveBeenCalledTimes(1);
  });
});
