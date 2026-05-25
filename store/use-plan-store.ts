import { create } from "zustand";

import { REFERENCE_TODAY, WEEKLY_PLAN } from "@/data";
import { WEEKDAY_ORDER } from "@/lib/constants";
import type { Weekday, WeeklyPlan, Workout, WorkoutDay } from "@/types";

/** ISO date for a given weekday within the plan's week (Monday-based). */
export function weekdayToISO(weekStart: string, weekday: Weekday): string {
  const offset = WEEKDAY_ORDER.indexOf(weekday);
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

interface PlanState {
  plan: WeeklyPlan;
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

export const usePlanStore = create<PlanState>((set) => ({
  plan: WEEKLY_PLAN,

  addWorkout: (weekday, workout) =>
    set((state) => ({
      plan: replaceDay(state.plan, weekday, {
        weekday,
        rest: false,
        workout: { ...workout, date: weekdayToISO(state.plan.weekStart, weekday) },
      }),
    })),

  updateWorkout: (weekday, workout) =>
    set((state) => ({
      plan: replaceDay(state.plan, weekday, {
        weekday,
        rest: false,
        workout: { ...workout, date: weekdayToISO(state.plan.weekStart, weekday) },
      }),
    })),

  removeWorkout: (weekday) =>
    set((state) => ({
      plan: replaceDay(state.plan, weekday, { weekday, rest: false }),
    })),

  setRest: (weekday) =>
    set((state) => ({
      plan: replaceDay(state.plan, weekday, { weekday, rest: true }),
    })),

  toggleCompleted: (weekday) =>
    set((state) => {
      const day = state.plan.days.find((d) => d.weekday === weekday);
      if (!day?.workout) return state;
      return {
        plan: replaceDay(state.plan, weekday, {
          ...day,
          workout: { ...day.workout, completed: !day.workout.completed },
        }),
      };
    }),
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
