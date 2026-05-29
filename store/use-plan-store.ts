import { create } from "zustand";

import { REFERENCE_TODAY, WEEKLY_PLAN } from "@/data";
import { WEEKDAY_ORDER } from "@/lib/constants";
import { readDashboardCache, writeDashboardCache } from "@/lib/dashboard-cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  loadPlanFromSupabase,
  removeWorkoutFromSupabase,
  setCompletedInSupabase,
  setRestInSupabase,
  upsertWorkoutToSupabase,
} from "@/lib/supabase-plan";
import type {
  SessionHistoryRecord,
  Weekday,
  WeeklyPlan,
  Workout,
  WorkoutDay,
} from "@/types";
import { useAuthStore } from "./use-auth-store";

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysISO(iso: string, days: number): string {
  const date = parseLocalDate(iso);
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
}

function weekStartISO(referenceDate: Date): string {
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const mondayBasedDay = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayBasedDay);
  return toLocalISODate(start);
}

function weekdayIndexFromISO(iso: string): number {
  return (parseLocalDate(iso).getDay() + 6) % 7;
}

export function currentLocalISODate(referenceDate = new Date()): string {
  return toLocalISODate(referenceDate);
}

export function completedWorkoutIdsForWeek(
  sessions: SessionHistoryRecord[],
  referenceDate = new Date(),
): ReadonlySet<string> {
  const start = weekStartISO(referenceDate);
  const end = addDaysISO(start, 7);
  return new Set(
    sessions
      .filter((session) => {
        const finishedDate = toLocalISODate(new Date(session.finishedAt));
        return finishedDate >= start && finishedDate < end;
      })
      .map((session) => session.workoutId),
  );
}

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
  setWorkoutCompleted: (workoutId: string, completed: boolean) => Promise<void>;
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

async function waitForAuthInitialization(): Promise<void> {
  if (!isSupabaseConfigured() || useAuthStore.getState().initialized) return;

  await new Promise<void>((resolve) => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.initialized) return;
      unsubscribe();
      resolve();
    });
  });
}

async function loadInitialPlan(): Promise<WeeklyPlan> {
  if (!isSupabaseConfigured()) return WEEKLY_PLAN;
  await waitForAuthInitialization();
  const userId = activeUserId();
  if (!userId) return emptyPlan();

  const cached = readDashboardCache<WeeklyPlan>("plan", userId);
  if (cached) return cached;

  const plan = await loadPlanFromSupabase(userId);
  writeDashboardCache("plan", userId, plan);
  return plan;
}

function cacheSyncedPlan(userId: string, plan: WeeklyPlan): void {
  if (usePlanStore.getState().plan === plan) {
    writeDashboardCache("plan", userId, plan);
  }
}

function cachePlanAfterSync(
  userId: string,
  plan: WeeklyPlan,
  sync: Promise<void>,
  errorMessage: string,
): void {
  void sync
    .then(() => cacheSyncedPlan(userId, plan))
    .catch((error) => console.error(errorMessage, error));
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
    const syncedPlan = get().plan;
    const userId = activeUserId();
    if (userId) {
      cachePlanAfterSync(
        userId,
        syncedPlan,
        upsertWorkoutToSupabase(weekday, next, userId),
        "Failed to sync added workout",
      );
    }
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
    const syncedPlan = get().plan;
    const userId = activeUserId();
    if (userId) {
      cachePlanAfterSync(
        userId,
        syncedPlan,
        upsertWorkoutToSupabase(weekday, next, userId),
        "Failed to sync updated workout",
      );
    }
  },

  removeWorkout: (weekday) => {
    set((state) => ({
      plan: replaceDay(state.plan, weekday, { weekday, rest: false }),
    }));
    const syncedPlan = get().plan;
    const userId = activeUserId();
    if (userId) {
      cachePlanAfterSync(
        userId,
        syncedPlan,
        removeWorkoutFromSupabase(weekday, userId),
        "Failed to sync removed workout",
      );
    }
  },

  setRest: (weekday) => {
    set((state) => ({
      plan: replaceDay(state.plan, weekday, { weekday, rest: true }),
    }));
    const syncedPlan = get().plan;
    const userId = activeUserId();
    if (userId) {
      cachePlanAfterSync(
        userId,
        syncedPlan,
        setRestInSupabase(weekday, userId),
        "Failed to sync rest day",
      );
    }
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
      const syncedPlan = get().plan;
      const userId = activeUserId();
      if (userId) {
        cachePlanAfterSync(
          userId,
          syncedPlan,
          setCompletedInSupabase(weekday, userId, nextCompleted),
          "Failed to sync workout completion",
        );
      }
    }
  },

  setWorkoutCompleted: async (workoutId, completed) => {
    let changedWeekday: Weekday | null = null;

    set((state) => {
      const day = state.plan.days.find((d) => d.workout?.id === workoutId);
      if (!day?.workout || day.workout.completed === completed) return state;

      changedWeekday = day.weekday;
      return {
        plan: replaceDay(state.plan, day.weekday, {
          ...day,
          workout: { ...day.workout, completed },
        }),
      };
    });

    if (changedWeekday !== null) {
      const syncedPlan = get().plan;
      const userId = activeUserId();
      if (userId) {
        try {
          await setCompletedInSupabase(changedWeekday, userId, completed);
          cacheSyncedPlan(userId, syncedPlan);
        } catch (error) {
          console.error("Failed to sync workout completion", error);
        }
      }
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

/** First upcoming workout on or after the reference date, ignoring already completed sessions. */
export function selectNextWorkout(
  plan: WeeklyPlan,
  completedWorkoutIds: ReadonlySet<string> = new Set(),
  referenceDateISO = REFERENCE_TODAY,
): Workout | undefined {
  const referenceWeekStart = weekStartISO(parseLocalDate(referenceDateISO));
  const todayIndex = weekdayIndexFromISO(referenceDateISO);

  let nextWorkout: { workout: Workout; weekdayIndex: number } | undefined;

  for (const day of plan.days) {
    if (day.rest || !day.workout) continue;

    const weekdayIndex = WEEKDAY_ORDER.indexOf(day.weekday);
    const workout: Workout = {
      ...day.workout,
      date: addDaysISO(referenceWeekStart, weekdayIndex),
    };

    if (
      weekdayIndex < todayIndex ||
      workout.completed ||
      completedWorkoutIds.has(workout.id)
    ) {
      continue;
    }

    if (!nextWorkout || weekdayIndex < nextWorkout.weekdayIndex) {
      nextWorkout = { workout, weekdayIndex };
    }
  }

  return nextWorkout?.workout;
}

/** Days that fall strictly after the reference date (for the "upcoming" list). */
export function selectUpcomingDays(plan: WeeklyPlan): WorkoutDay[] {
  return plan.days.filter(
    (d) => weekdayToISO(plan.weekStart, d.weekday) > REFERENCE_TODAY,
  );
}
