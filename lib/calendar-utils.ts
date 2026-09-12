import type {
  BodyMetricRecord,
  ProgressPhotoRecord,
  SessionHistoryRecord,
  Weekday,
  WeeklyPlan,
  Workout,
  WorkoutDay,
  WorkoutType,
} from "@/types";

import { WEEKDAY_ORDER } from "./constants";

/* ----------------------------- date helpers ----------------------------- */

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Monday-based weekday index (Mon = 0 … Sun = 6) for a local Date. */
function mondayBasedIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** ISO date for a weekday within the plan's Monday-anchored week. */
function weekdayToISO(weekStart: string, weekday: Weekday): string {
  const offset = WEEKDAY_ORDER.indexOf(weekday);
  const d = parseLocalDate(weekStart);
  d.setDate(d.getDate() + offset);
  return toLocalISODate(d);
}

/** Monday-based weekday for a local ISO date (Mon … Sun). */
export function weekdayFromISO(iso: string): Weekday {
  return WEEKDAY_ORDER[mondayBasedIndex(parseLocalDate(iso))];
}

/* ----------------------------- month grid ----------------------------- */

export interface CalendarCell {
  /** ISO date (YYYY-MM-DD). */
  iso: string;
  /** Day of month (1–31). */
  day: number;
  /** False for the leading/trailing days that belong to the neighbouring months. */
  inCurrentMonth: boolean;
  /** True when the cell matches `todayISO`. */
  isToday: boolean;
}

/** Wraps a (year, month) pair by `delta` months, normalising the overflow. `month` is 0-based. */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const base = new Date(year, month + delta, 1);
  return { year: base.getFullYear(), month: base.getMonth() };
}

/**
 * Builds a Monday-first calendar grid for the given month. The grid always
 * starts on a Monday and ends on a Sunday, padded with the neighbouring
 * months' days so every row has 7 cells. `month` is 0-based.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  todayISO?: string,
): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const cursor = new Date(firstOfMonth);
  // Step back to the Monday on or before the 1st.
  cursor.setDate(cursor.getDate() - mondayBasedIndex(firstOfMonth));

  const cells: CalendarCell[] = [];
  // Six rows cover every possible month layout; trim trailing full weeks below.
  for (let i = 0; i < 42; i += 1) {
    const iso = toLocalISODate(cursor);
    cells.push({
      iso,
      day: cursor.getDate(),
      inCurrentMonth: cursor.getMonth() === month,
      isToday: iso === todayISO,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Drop the final week if it is entirely in the next month (keeps the grid tight).
  const lastWeek = cells.slice(35);
  if (lastWeek.every((cell) => !cell.inCurrentMonth)) {
    return cells.slice(0, 35);
  }
  return cells;
}

/* ----------------------------- data grouping ----------------------------- */

/** Buckets completed sessions by their local finish date (YYYY-MM-DD). */
export function groupSessionsByDay(
  sessions: SessionHistoryRecord[],
): Map<string, SessionHistoryRecord[]> {
  const out = new Map<string, SessionHistoryRecord[]>();
  for (const session of sessions) {
    const iso = toLocalISODate(new Date(session.finishedAt));
    const bucket = out.get(iso) ?? [];
    bucket.push(session);
    out.set(iso, bucket);
  }
  return out;
}

/**
 * Maps each planned workout of the recurring weekly template to its weekday.
 * Keyed by weekday (not an absolute date) so the template repeats across every
 * calendar week — look up a date's workout via `weekdayFromISO(iso)`.
 */
export function plannedWorkoutsByDay(plan: WeeklyPlan): Map<Weekday, Workout> {
  const out = new Map<Weekday, Workout>();
  for (const day of plan.days) {
    if (day.rest || !day.workout) continue;
    out.set(day.weekday, day.workout);
  }
  return out;
}

/** Latest body-metric record per day (ties broken by `updatedAt`). */
export function metricsByDay(
  records: BodyMetricRecord[],
): Map<string, BodyMetricRecord> {
  const out = new Map<string, BodyMetricRecord>();
  for (const record of records) {
    const existing = out.get(record.date);
    if (!existing || existing.updatedAt < record.updatedAt) {
      out.set(record.date, record);
    }
  }
  return out;
}

/** Latest progress photo per day (ties broken by `createdAt`). */
export function photosByDay(
  photos: ProgressPhotoRecord[],
): Map<string, ProgressPhotoRecord> {
  const out = new Map<string, ProgressPhotoRecord>();
  for (const photo of photos) {
    const existing = out.get(photo.takenAt);
    if (!existing || existing.createdAt < photo.createdAt) {
      out.set(photo.takenAt, photo);
    }
  }
  return out;
}

/* ----------------------------- plan editing ----------------------------- */

export interface MoveWorkoutResult {
  plan: WeeklyPlan;
  /** False when the move was a no-op (same day, empty source, or occupied target). */
  moved: boolean;
  /** The relocated workout (with refreshed id + date), present only when `moved`. */
  workout?: Workout;
}

/**
 * Moves the workout on `from` to the empty `to` slot within a week. Pure: returns
 * a new plan, leaving the input untouched. The relocated workout gets a fresh
 * `id` (so persistence never collides with the still-present source row) and its
 * `date` is recomputed for the target weekday.
 */
export function moveWorkoutBetweenDays(
  plan: WeeklyPlan,
  from: Weekday,
  to: Weekday,
  newId: string,
): MoveWorkoutResult {
  if (from === to) return { plan, moved: false };

  const source = plan.days.find((d) => d.weekday === from);
  const target = plan.days.find((d) => d.weekday === to);
  if (!source?.workout || target?.workout) return { plan, moved: false };

  const workout: Workout = {
    ...source.workout,
    id: newId,
    date: weekdayToISO(plan.weekStart, to),
  };

  const days = plan.days.map((day) => {
    if (day.weekday === from) return { weekday: from, rest: false };
    if (day.weekday === to) return { weekday: to, rest: false, workout };
    return day;
  });

  return { plan: { ...plan, days }, moved: true, workout };
}

export interface SwapWorkoutResult {
  plan: WeeklyPlan;
  /** False when the swap was a no-op (same day or a missing day). */
  swapped: boolean;
}

/**
 * Exchanges the contents (workout or rest) of two weekdays within a week. Pure:
 * returns a new plan, leaving the input untouched. Each relocated workout keeps
 * its id but has its `date` recomputed for the target weekday.
 */
export function swapWorkoutDays(
  plan: WeeklyPlan,
  dayA: Weekday,
  dayB: Weekday,
): SwapWorkoutResult {
  if (dayA === dayB) return { plan, swapped: false };

  const a = plan.days.find((d) => d.weekday === dayA);
  const b = plan.days.find((d) => d.weekday === dayB);
  if (!a || !b) return { plan, swapped: false };

  const place = (target: Weekday, source: WorkoutDay): WorkoutDay =>
    source.workout
      ? {
          weekday: target,
          rest: false,
          workout: { ...source.workout, date: weekdayToISO(plan.weekStart, target) },
        }
      : { weekday: target, rest: source.rest };

  const toA = place(dayA, b);
  const toB = place(dayB, a);

  const days = plan.days.map((day) => {
    if (day.weekday === dayA) return toA;
    if (day.weekday === dayB) return toB;
    return day;
  });

  return { plan: { ...plan, days }, swapped: true };
}

/* ----------------------------- type styling ----------------------------- */

/**
 * Workout-type chips for the day-detail panel. Uniform on purpose — the chip
 * spells the type out, so a per-type hue was decoration. Literal class strings
 * so Tailwind's compiler keeps them.
 */
const WORKOUT_TYPE_BADGE_CLASS = "bg-surface-interactive text-foreground";

export const WORKOUT_TYPE_BADGE_CLASSES: Record<WorkoutType, string> = {
  Push: WORKOUT_TYPE_BADGE_CLASS,
  Pull: WORKOUT_TYPE_BADGE_CLASS,
  Nogi: WORKOUT_TYPE_BADGE_CLASS,
  "Full Body": WORKOUT_TYPE_BADGE_CLASS,
  Custom: "bg-muted text-muted-foreground",
  Siła: WORKOUT_TYPE_BADGE_CLASS,
  Hipertrofia: WORKOUT_TYPE_BADGE_CLASS,
  Wytrzymałość: WORKOUT_TYPE_BADGE_CLASS,
  Cardio: WORKOUT_TYPE_BADGE_CLASS,
  Mobilność: WORKOUT_TYPE_BADGE_CLASS,
};

/**
 * Solid dot marking a planned workout inside a calendar cell. A 4px unlabelled
 * dot cannot carry nine distinguishable meanings, so it says one thing —
 * "something is planned here" — in the green data accent.
 */
const WORKOUT_TYPE_DOT_CLASS = "bg-data";

export const WORKOUT_TYPE_DOT_CLASSES: Record<WorkoutType, string> = {
  Push: WORKOUT_TYPE_DOT_CLASS,
  Pull: WORKOUT_TYPE_DOT_CLASS,
  Nogi: WORKOUT_TYPE_DOT_CLASS,
  "Full Body": WORKOUT_TYPE_DOT_CLASS,
  Custom: "bg-muted-foreground",
  Siła: WORKOUT_TYPE_DOT_CLASS,
  Hipertrofia: WORKOUT_TYPE_DOT_CLASS,
  Wytrzymałość: WORKOUT_TYPE_DOT_CLASS,
  Cardio: WORKOUT_TYPE_DOT_CLASS,
  Mobilność: WORKOUT_TYPE_DOT_CLASS,
};

export function workoutTypeDotClass(type?: WorkoutType): string {
  return WORKOUT_TYPE_DOT_CLASSES[type ?? "Custom"];
}
