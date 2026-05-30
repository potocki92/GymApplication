/**
 * Reproduces the onboarding submission bug: when the auth store has not been
 * populated (e.g. on the `(auth)/onboarding` page, whose layout does not mount
 * `AuthHydrationGate`), `useProfileStore.update()` short-circuits to `null` and
 * the wizard surfaces a generic error instead of saving.
 *
 * Pre-fix: `wizardSubmitFails` test passes because `update()` returns null and
 * Supabase is never called.
 * Post-fix: the store falls back to `supabase.auth.getUser()` when the auth
 * store is empty, the upsert succeeds, and the wizard completes.
 */
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/config", () => ({
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  isSupabaseConfigured: () => true,
}));

const getUserMock = vi.fn();
const maybeSingleMock = vi.fn();
const upsertChain = {
  upsert: vi.fn(() => ({
    select: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
  })),
};

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: { getUser: getUserMock },
    from: vi.fn(() => upsertChain),
  }),
  isSupabaseConfigured: () => true,
}));

import { useAuthStore } from "@/store/use-auth-store";
import { useProfileStore } from "@/store/use-profile-store";

const TEST_USER = { id: "u-1" } as User;

const PROFILE_ROW = {
  id: "u-1",
  email: "a@b.c",
  display_name: null,
  onboarding_completed_at: "2026-05-27T00:00:00.000Z",
  gender: "male",
  birth_date: "1990-01-01",
  height_cm: 180,
  current_weight_kg: 80,
  target_weight_kg: 75,
  training_goal: "lose_fat",
  experience_level: "intermediate",
  available_equipment: ["barbell", "dumbbell"],
  training_days_per_week: 4,
  preferred_workout_duration_min: 60,
  preferred_workout_types: ["push_pull_legs"],
  units_weight: "kg",
  units_length: "cm",
  theme_preference: "dark",
  notifications_enabled: true,
  notifications_workout_reminders: true,
  notifications_progress_updates: true,
  updated_at: "2026-05-27T00:00:00.000Z",
};

beforeEach(() => {
  useAuthStore.setState({ user: null, initialized: false });
  useProfileStore.getState().reset();
  getUserMock.mockReset();
  maybeSingleMock.mockReset();
  upsertChain.upsert.mockClear();
});

describe("useProfileStore.update", () => {
  it("saves the patch when the auth store is populated", async () => {
    useAuthStore.setState({
      user: TEST_USER,
      initialized: true,
    });
    maybeSingleMock.mockResolvedValueOnce({ data: PROFILE_ROW, error: null });

    const result = await useProfileStore.getState().update({
      gender: "male",
      heightCm: 180,
    });

    expect(result).not.toBeNull();
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u-1", gender: "male", height_cm: 180 }),
      expect.any(Object),
    );
  });

  it("falls back to supabase.auth.getUser() when the auth store is empty (onboarding-layout bug)", async () => {
    // Auth store is null — this is the state on `(auth)/onboarding` because
    // AuthHydrationGate is not mounted in that layout.
    expect(useAuthStore.getState().user).toBeNull();

    // Supabase cookies are valid, so getUser() returns the signed-in user.
    getUserMock.mockResolvedValue({
      data: { user: { id: "u-1" } },
      error: null,
    });
    maybeSingleMock.mockResolvedValueOnce({ data: PROFILE_ROW, error: null });

    const result = await useProfileStore.getState().update({
      gender: "male",
      heightCm: 180,
    });

    expect(getUserMock).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u-1" }),
      expect.any(Object),
    );
  });

  it("surfaces the supabase error message when the upsert fails", async () => {
    useAuthStore.setState({
      user: TEST_USER,
      initialized: true,
    });
    maybeSingleMock.mockResolvedValueOnce({
      data: null,
      error: { message: "permission denied for table profiles" },
    });

    const result = await useProfileStore.getState().update({ heightCm: 180 });

    expect(result).toBeNull();
    expect(useProfileStore.getState().error).toBe(
      "permission denied for table profiles",
    );
  });
});
