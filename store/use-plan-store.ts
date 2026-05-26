import { create } from "zustand";

import { REFERENCE_TODAY, WEEKLY_PLAN } from "@/data";
import { WEEKDAY_ORDER } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  loadPlanFromSupabase,
  removeWorkoutFromSupabase,
  setCompletedInSupabase,
  setRestInSupabase,
  upsertWorkoutToSupabase,
} from "@/lib/supabase-plan";
import type { Weekday, WeeklyPlan, Workout, WorkoutDay } from "@/types";
import { useAuthStore } from "./use-auth-store";

/** ISO date for a given weekday within the plan's week (Monday-based). */
export function weekdayToISO(weekStart: string, weekday: Weekday): string {
  const offset = WEEKDAY_ORDER.indexOf(weekday);
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

interface PlanState {
  plan: WeeklyPlan;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  rehydrate: () => Promise<void>;
  addWorkout: (weekday: Weekday, workout: Workout) => void;
  updateWorkout: (weekday: Weekday, workout: Workout) => void;
  removeWorkout: (weekday: Weekday) => void;
  setRest: (weekday: Weekday) => void;
  toggleCompleted: (weekday: Weekday) => void;
}

function replaceDay(plan: WeeklyPlan, weekday: Weekday, next: WorkoutDay): WeeklyPlan {
  return {
    ...plan,
    days: plan.days.map((d) => (d.weekday === weekday ? next : d)),
  };
}

function emptyPlan(): WeeklyPlan {
  return {
    id: "plan-user",
    weekStart: WEEKLY_PLAN.weekStart,
    days: WEEKDAY_ORDER.map((weekday) => ({ weekday, rest: false })),
  };
}

function activeUserId(): string | null {
  if (!isSupabaseConfigured()) return null;
  return useAuthStore.getState().user?.id ?? null;
}

async function loadInitialPlan(): Promise<WeeklyPlan> {
  if (!isSupabaseConfigured()) return WEEKLY_PLAN;
  const userId = activeUserId();
  if (!userId) return emptyPlan();
  return loadPlanFromSupabase(userId);
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plan: WEEKLY_PLAN,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const plan = await loadInitialPlan();
    set({ plan, hydrated: true });
  },

  rehydrate: async () => {
    const plan = await loadInitialPlan();
    set({ plan, hydrated: true });
  },

  addWorkout: (weekday, workout) => {
    const date = weekdayToISO(get().plan.weekStart, weekday);
    const next: Workout = { ...workout, date };
    set((state) => ({
      plan: replaceDay(state.plan, weekday, {
        weekday,
        rest: false,
        workout: next,
      }),
    }));
    const userId = activeUserId();
    if (userId) void upsertWorkoutToSupabase(weekday, next, userId);
  },

  updateWorkout: (weekday, workout) => {
    const date = weekdayToISO(get().plan.weekStart, weekday);
    const next: Workout = { ...workout, date };
    set((state) => ({
      plan: replaceDay(state.plan, weekday, {
        weekday,
        rest: false,
        workout: next,
      }),
    }));
    const userId = activeUserId();
    if (userId) void upsertWorkoutToSupabase(weekday, next, userId);
  },

  removeWorkout: (weekday) => {
    set((state) => ({
      plan: replaceDay(state.plan, weekday, { weekday, rest: false }),
    }));
    const userId = activeUserId();
    if (userId) void removeWorkoutFromSupabase(weekday, userId);
  },

  setRest: (weekday) => {
    set((state) => ({
      plan: replaceDay(state.plan, weekday, { weekday, rest: true }),
    }));
    const userId = activeUserId();
    if (userId) void setRestInSupabase(weekday, userId);
  },

  toggleCompleted: (weekday) => {
    let nextCompleted: boolean | null = null;
    set((state) => {
      const day = state.plan.days.find((d) => d.weekday === weekday);
      if (!day?.workout) return state;
      nextCompleted = !day.workout.completed;
      return {
        plan: replaceDay(state.plan, weekday, {
          ...day,
          workout: { ...day.workout, completed: nextCompleted },
        }),
      };
    });
    if (nextCompleted !== null) {
      const userId = activeUserId();
      if (userId) void setCompletedInSupabase(weekday, userId, nextCompleted);
    }
  },
}));

/* ----------------------------- selectors ----------------------------- */

export function selectTrainingDays(plan: WeeklyPlan): WorkoutDay[] {
  return plan.days.filter((d) => !d.rest && d.workout);
}

export function selectCompletedCount(plan: WeeklyPlan): number {
  return selectTrainingDays(plan).filter((d) => d.workout?.completed).length;
}

/** Most recent completed workout before the reference date. */
export function selectLastWorkout(plan: WeeklyPlan): Workout | undefined {
  return selectTrainingDays(plan)
    .map((d) => d.workout!)
    .filter((w) => w.completed && (w.date ?? "") < REFERENCE_TODAY)
    .sort((a, b) => (a.date! < b.date! ? 1 : -1))[0];
}

/** First upcoming (non-rest) workout on or after the reference date. */
export function selectNextWorkout(plan: WeeklyPlan): Workout | undefined {
  return selectTrainingDays(plan)
    .map((d) => d.workout!)
    .filter((w) => (w.date ?? "") >= REFERENCE_TODAY)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1))[0];
}

/** Days that fall strictly after the reference date (for the "upcoming" list). */
export function selectUpcomingDays(plan: WeeklyPlan): WorkoutDay[] {
  return plan.days.filter(
    (d) => weekdayToISO(plan.weekStart, d.weekday) > REFERENCE_TODAY,
  );
}
