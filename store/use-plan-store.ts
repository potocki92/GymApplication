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
      const userId = activeUserId();
      if (userId) {
        try {
          await setCompletedInSupabase(changedWeekday, userId, completed);
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
