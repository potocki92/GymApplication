import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WeeklyPlan, Workout } from "@/types";

const mocks = vi.hoisted(() => ({
  loadPlanFromSupabase: vi.fn<() => Promise<WeeklyPlan>>(),
  removeWorkoutFromSupabase: vi.fn<() => Promise<void>>(),
  setCompletedInSupabase: vi.fn<() => Promise<void>>(),
  setRestInSupabase: vi.fn<() => Promise<void>>(),
  upsertWorkoutToSupabase: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/supabase-plan", () => ({
  loadPlanFromSupabase: mocks.loadPlanFromSupabase,
  removeWorkoutFromSupabase: mocks.removeWorkoutFromSupabase,
  setCompletedInSupabase: mocks.setCompletedInSupabase,
  setRestInSupabase: mocks.setRestInSupabase,
  upsertWorkoutToSupabase: mocks.upsertWorkoutToSupabase,
}));

import {
  DASHBOARD_CACHE_TTL_MS,
  readDashboardCache,
  writeDashboardCache,
} from "@/lib/dashboard-cache";
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

function workout(id: string): Workout {
  return {
    id,
    name: id,
    type: "Custom",
    exercises: [],
    estimatedDurationMin: 45,
    completed: false,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.loadPlanFromSupabase.mockReset();
  mocks.removeWorkoutFromSupabase.mockReset();
  mocks.setCompletedInSupabase.mockReset();
  mocks.setRestInSupabase.mockReset();
  mocks.upsertWorkoutToSupabase.mockReset();
  useAuthStore.setState({ user: USER, initialized: true });
  usePlanStore.setState({ plan: CACHED_PLAN, hydrated: false });
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

  it("writes optimistic plan changes to cache only after remote sync resolves", async () => {
    const sync = deferred<void>();
    mocks.upsertWorkoutToSupabase.mockReturnValueOnce(sync.promise);

    usePlanStore.getState().addWorkout("monday", workout("delayed-sync"));

    expect(readDashboardCache<WeeklyPlan>("plan", USER.id)).toBeNull();

    sync.resolve();
    await sync.promise;
    await flushPromises();

    expect(readDashboardCache<WeeklyPlan>("plan", USER.id)?.days[0].workout?.id)
      .toBe("delayed-sync");
  });

  it("does not cache optimistic plan changes when remote sync rejects", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.upsertWorkoutToSupabase.mockRejectedValueOnce(new Error("network"));

    usePlanStore.getState().addWorkout("monday", workout("failed-sync"));
    await flushPromises();

    expect(readDashboardCache<WeeklyPlan>("plan", USER.id)).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to sync added workout",
      expect.any(Error),
    );

    consoleError.mockRestore();
  });

  it("does not overwrite cache with an older mutation when plan changes again before sync resolves", async () => {
    const olderSync = deferred<void>();
    mocks.upsertWorkoutToSupabase
      .mockReturnValueOnce(olderSync.promise)
      .mockResolvedValueOnce();

    usePlanStore.getState().addWorkout("monday", workout("older-sync"));
    usePlanStore.getState().updateWorkout("monday", workout("newer-sync"));
    await flushPromises();

    expect(readDashboardCache<WeeklyPlan>("plan", USER.id)?.days[0].workout?.id)
      .toBe("newer-sync");

    olderSync.resolve();
    await olderSync.promise;
    await flushPromises();

    expect(readDashboardCache<WeeklyPlan>("plan", USER.id)?.days[0].workout?.id)
      .toBe("newer-sync");
  });
});
