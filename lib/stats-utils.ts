import type {
  ActivityDay,
  ActivityLevel,
  BodyMetricGoal,
  BodyMetricKey,
  BodyMetricRecord,
  ExerciseHistoryRecord,
  SessionHistoryRecord,
} from "@/types";

import { sortRecords } from "./metrics-utils";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeightSummary {
  startKg: number | null;
  currentKg: number | null;
  targetKg: number | null;
  /** kg lost (positive) or gained (negative) since start; null when unknown. */
  deltaKg: number | null;
  /** kg remaining to reach the goal in the chosen direction; null when unknown. */
  remainingKg: number | null;
  /** 0–100 progress toward target; null when unknown. */
  progressPct: number | null;
  /** "cut" when goal weight is lower than start, "bulk" when higher, null otherwise. */
  direction: "cut" | "bulk" | null;
}

/**
 * Resolves the start / current / target weights from a body-metrics record set
 * plus an optional goal. The start preference order is: explicit goal start →
 * earliest recorded weight. Current weight uses the most recent record.
 */
export function buildWeightSummary(
  records: BodyMetricRecord[],
  goal: BodyMetricGoal | null,
  profileStartKg: number | null,
  profileTargetKg: number | null,
): WeightSummary {
  const withWeight = sortRecords(records).filter(
    (r) => typeof r.weightKg === "number" && Number.isFinite(r.weightKg),
  );
  const earliest = withWeight[0]?.weightKg ?? null;
  const latest = withWeight.at(-1)?.weightKg ?? null;

  const startKg = goal?.startKg ?? profileStartKg ?? earliest ?? null;
  const targetKg = goal?.targetKg ?? profileTargetKg ?? null;
  const currentKg = latest ?? profileStartKg ?? null;

  const deltaKg = startKg != null && currentKg != null
    ? Math.round((startKg - currentKg) * 10) / 10
    : null;

  let direction: "cut" | "bulk" | null = null;
  if (startKg != null && targetKg != null && startKg !== targetKg) {
    direction = targetKg < startKg ? "cut" : "bulk";
  }

  let progressPct: number | null = null;
  let remainingKg: number | null = null;
  if (startKg != null && targetKg != null && currentKg != null && startKg !== targetKg) {
    const raw = ((startKg - currentKg) / (startKg - targetKg)) * 100;
    progressPct = Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
    remainingKg = Math.round((currentKg - targetKg) * 10) / 10;
    if (direction === "bulk") remainingKg = -remainingKg;
    if (remainingKg < 0) remainingKg = 0;
  }

  return {
    startKg,
    currentKg,
    targetKg,
    deltaKg,
    remainingKg,
    progressPct,
    direction,
  };
}

export interface WorkoutCounts {
  total: number;
  thisWeek: number;
  thisMonth: number;
  last30Days: number;
  /** % change between (last 30d) and (the 30d before that). null when no prior data. */
  trendPct: number | null;
}

function startOfISOWeek(d: Date): Date {
  const day = d.getUTCDay() || 7;
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  out.setUTCDate(out.getUTCDate() - (day - 1));
  return out;
}

function startOfUTCMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function buildWorkoutCounts(
  sessions: SessionHistoryRecord[],
  now: Date = new Date(),
): WorkoutCounts {
  const total = sessions.length;
  const nowMs = now.getTime();
  const weekStart = startOfISOWeek(now).getTime();
  const monthStart = startOfUTCMonth(now).getTime();
  const since30 = nowMs - 30 * DAY_MS;
  const since60 = nowMs - 60 * DAY_MS;

  let thisWeek = 0;
  let thisMonth = 0;
  let last30 = 0;
  let prev30 = 0;
  for (const s of sessions) {
    if (s.finishedAt >= weekStart) thisWeek += 1;
    if (s.finishedAt >= monthStart) thisMonth += 1;
    if (s.finishedAt >= since30) last30 += 1;
    else if (s.finishedAt >= since60) prev30 += 1;
  }

  const trendPct =
    prev30 > 0 ? Math.round(((last30 - prev30) / prev30) * 100) : null;

  return { total, thisWeek, thisMonth, last30Days: last30, trendPct };
}

export interface WeeklyActivityPoint {
  /** ISO date of the Monday that starts the week (UTC). */
  weekStart: string;
  /** Short human label like "20 maja". */
  label: string;
  count: number;
}

/**
 * Buckets sessions into the last N ISO weeks (Mon-anchored, UTC) and emits a
 * dense series — including zero-count weeks — so the chart x-axis stays even.
 */
export function buildWeeklyActivity(
  sessions: SessionHistoryRecord[],
  weeks: number,
  now: Date = new Date(),
): WeeklyActivityPoint[] {
  const currentWeekStart = startOfISOWeek(now);
  const buckets = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const d = new Date(currentWeekStart);
    d.setUTCDate(d.getUTCDate() - i * 7);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const s of sessions) {
    const wkStart = startOfISOWeek(new Date(s.finishedAt))
      .toISOString()
      .slice(0, 10);
    if (buckets.has(wkStart)) {
      buckets.set(wkStart, (buckets.get(wkStart) ?? 0) + 1);
    }
  }

  const months = [
    "sty",
    "lut",
    "mar",
    "kwi",
    "maj",
    "cze",
    "lip",
    "sie",
    "wrz",
    "paź",
    "lis",
    "gru",
  ];

  return [...buckets.entries()].map(([weekStart, count]) => {
    const d = new Date(`${weekStart}T00:00:00Z`);
    const label = `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
    return { weekStart, label, count };
  });
}

function utcDayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Count of consecutive days (UTC) ending today — or yesterday, if today has no
 * session yet — on which at least one workout was completed. Returns 0 when the
 * most recent workout is older than yesterday.
 */
export function buildWorkoutStreak(
  sessions: SessionHistoryRecord[],
  now: Date = new Date(),
): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => utcDayKey(s.finishedAt)));

  const cursor = new Date(now);
  cursor.setUTCHours(0, 0, 0, 0);
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** Longest run of consecutive calendar days that contain at least one session. */
export function buildLongestStreak(sessions: SessionHistoryRecord[]): number {
  if (sessions.length === 0) return 0;
  const days = Array.from(new Set(sessions.map((s) => utcDayKey(s.finishedAt)))).sort();

  let longest = 1;
  let current = 1;
  for (let i = 1; i < days.length; i += 1) {
    const prev = new Date(`${days[i - 1]}T00:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() + 1);
    if (prev.toISOString().slice(0, 10) === days[i]) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

/** Count of completed sessions whose finish date falls within the last `weeks` weeks. */
export function countSessionsInWeeks(
  sessions: SessionHistoryRecord[],
  weeks: number,
  now: Date = new Date(),
): number {
  const cutoff = now.getTime() - weeks * 7 * DAY_MS;
  return sessions.filter((s) => s.finishedAt >= cutoff).length;
}

export interface WeeklyTotals {
  workouts: number;
  durationMin: number;
  volumeKg: number;
  kcal: number;
}

/** Aggregates the current ISO week's sessions into the dashboard stat tiles. */
export function buildWeeklyTotals(
  sessions: SessionHistoryRecord[],
  now: Date = new Date(),
): WeeklyTotals {
  const weekStart = startOfISOWeek(now).getTime();
  let workouts = 0;
  let activeMs = 0;
  let volumeKg = 0;
  let kcal = 0;
  for (const s of sessions) {
    if (s.finishedAt < weekStart) continue;
    workouts += 1;
    activeMs += s.totalActiveMs;
    volumeKg += s.totalVolumeKg;
    kcal += s.calories ?? 0;
  }
  return {
    workouts,
    durationMin: Math.round(activeMs / 60000),
    volumeKg: Math.round(volumeKg),
    kcal: Math.round(kcal),
  };
}

function activityLevelFromCount(count: number): ActivityLevel {
  if (count <= 0) return 0;
  if (count === 1) return 2;
  if (count === 2) return 3;
  return 4;
}

/**
 * Builds a GitHub-style contribution grid for the last N weeks. The series is
 * dense (every day present) and starts on a Monday / ends on a Sunday so the
 * heatmap's 7-row weekday columns line up.
 */
export function buildActivityCalendar(
  sessions: SessionHistoryRecord[],
  weeks: number,
  now: Date = new Date(),
): ActivityDay[] {
  const end = startOfISOWeek(now);
  end.setUTCDate(end.getUTCDate() + 6);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (weeks * 7 - 1));

  const counts = new Map<string, number>();
  for (const s of sessions) {
    const key = utcDayKey(s.finishedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days: ActivityDay[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({ date: key, level: activityLevelFromCount(counts.get(key) ?? 0) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export interface MeasurementDelta {
  metric: BodyMetricKey;
  startValue: number | null;
  currentValue: number | null;
  deltaAbs: number | null;
  /** Signed percent change vs. start. null when start is 0 or missing. */
  deltaPct: number | null;
}

const TRACKED_METRICS: BodyMetricKey[] = [
  "weightKg",
  "chestCm",
  "waistCm",
  "hipsCm",
  "bodyFatPct",
];

export function buildMeasurementDeltas(
  records: BodyMetricRecord[],
): MeasurementDelta[] {
  const sorted = sortRecords(records);
  return TRACKED_METRICS.map((metric) => {
    const withValue = sorted.filter(
      (r) => typeof r[metric] === "number" && Number.isFinite(r[metric]),
    );
    if (withValue.length === 0) {
      return { metric, startValue: null, currentValue: null, deltaAbs: null, deltaPct: null };
    }
    const startValue = withValue[0][metric] as number;
    const currentValue = withValue.at(-1)![metric] as number;
    const deltaAbs = Math.round((currentValue - startValue) * 10) / 10;
    const deltaPct =
      startValue === 0 ? null : Math.round((deltaAbs / startValue) * 1000) / 10;
    return { metric, startValue, currentValue, deltaAbs, deltaPct };
  });
}

export interface StrengthProgressPoint {
  /** ISO date YYYY-MM-DD when the set was completed. */
  date: string;
  /** Best 1RM for that day across all tracked exercises. */
  topOneRMKg: number;
}

/**
 * Best estimated 1RM per day across the user's history. One series — caller
 * can decide to filter by exercise upstream if they want per-exercise breakdowns.
 */
export function buildStrengthProgress(
  records: ExerciseHistoryRecord[],
): StrengthProgressPoint[] {
  const byDate = new Map<string, number>();
  for (const r of records) {
    const date = new Date(r.completedAt).toISOString().slice(0, 10);
    const best = Math.max(byDate.get(date) ?? 0, r.oneRMKg);
    byDate.set(date, best);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, kg]) => ({
      date,
      topOneRMKg: Math.round(kg * 10) / 10,
    }));
}

export type MotivationTone = "success" | "warning" | "info" | "neutral";

export interface MotivationMessage {
  tone: MotivationTone;
  title: string;
  body: string;
}

/**
 * Picks a motivational message based on the user's current trajectory. Priority:
 * goal reached → ahead-of-pace → on-track → behind → just-started → empty.
 * Copy is Polish (the app's only locale).
 */
export function pickMotivation(
  weight: WeightSummary,
  counts: WorkoutCounts,
): MotivationMessage {
  if (weight.progressPct != null && weight.progressPct >= 100) {
    return {
      tone: "success",
      title: "Cel osiągnięty! 🎉",
      body: "Gratulacje — utrzymaj efekty i ustaw kolejny cel.",
    };
  }
  if (weight.progressPct != null && weight.progressPct >= 75) {
    return {
      tone: "success",
      title: "Świetne tempo!",
      body: `Jesteś już ${weight.progressPct}% drogi do celu. Trzymaj kurs.`,
    };
  }
  if (counts.last30Days >= 12) {
    return {
      tone: "success",
      title: "Mocna konsekwencja",
      body: `${counts.last30Days} treningów w ostatnich 30 dniach — robisz świetną robotę.`,
    };
  }
  if (weight.progressPct != null && weight.progressPct >= 40) {
    return {
      tone: "info",
      title: "Jesteś na dobrej drodze",
      body: `${weight.progressPct}% celu zaliczone. Następne kilo blisko.`,
    };
  }
  if (counts.total === 0 && weight.currentKg == null) {
    return {
      tone: "neutral",
      title: "Zacznij swoją podróż",
      body: "Dodaj pierwszy pomiar wagi i ukończ pierwszy trening, aby zobaczyć postępy.",
    };
  }
  if (counts.thisWeek === 0) {
    return {
      tone: "warning",
      title: "Wróć do rytmu",
      body: "W tym tygodniu jeszcze nie trenowałeś — zaplanuj sesję na najbliższe dni.",
    };
  }
  return {
    tone: "info",
    title: "Krok po kroku",
    body: "Małe postępy każdego tygodnia dają duży efekt. Trzymaj się planu.",
  };
}

export interface TimelineEvent {
  id: string;
  /** Epoch ms when the event happened. */
  at: number;
  type: "first_workout" | "first_weight" | "weight_milestone" | "pr_milestone" | "goal_set";
  title: string;
  description: string;
}

/**
 * Reconstructs an "achievements" timeline from the user's data. Picks the
 * first workout, first measurement, every 5% goal milestone crossed, and
 * each new top-PR. Sorted newest first.
 */
export function buildTimeline(
  sessions: SessionHistoryRecord[],
  metrics: BodyMetricRecord[],
  goal: BodyMetricGoal | null,
  history: ExerciseHistoryRecord[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  const firstSession = [...sessions].sort((a, b) => a.finishedAt - b.finishedAt)[0];
  if (firstSession) {
    events.push({
      id: `first-workout-${firstSession.id}`,
      at: firstSession.finishedAt,
      type: "first_workout",
      title: "Pierwszy ukończony trening",
      description: firstSession.workoutName,
    });
  }

  const sortedMetrics = sortRecords(metrics).filter(
    (r) => typeof r.weightKg === "number",
  );
  const firstMetric = sortedMetrics[0];
  if (firstMetric) {
    events.push({
      id: `first-weight-${firstMetric.id}`,
      at: new Date(`${firstMetric.date}T12:00:00Z`).getTime(),
      type: "first_weight",
      title: "Pierwszy pomiar wagi",
      description: `${firstMetric.weightKg} kg`,
    });
  }

  if (goal && sortedMetrics.length > 0) {
    const milestones = [25, 50, 75, 100];
    let lastSeen = -1;
    for (const r of sortedMetrics) {
      const pct = ((goal.startKg - r.weightKg) / (goal.startKg - goal.targetKg)) * 100;
      const clamped = Math.max(0, Math.min(100, pct));
      for (const m of milestones) {
        if (clamped >= m && lastSeen < m) {
          events.push({
            id: `milestone-${m}-${r.id}`,
            at: new Date(`${r.date}T12:00:00Z`).getTime(),
            type: "weight_milestone",
            title: `${m}% celu osiągnięte`,
            description: `${r.weightKg} kg`,
          });
          lastSeen = m;
        }
      }
    }
  }

  const bestSoFar = new Map<string, number>();
  const prMilestones: TimelineEvent[] = [];
  const sortedHistory = [...history].sort((a, b) => a.completedAt - b.completedAt);
  for (const r of sortedHistory) {
    const prev = bestSoFar.get(r.exerciseId) ?? 0;
    if (r.oneRMKg > prev) {
      bestSoFar.set(r.exerciseId, r.oneRMKg);
      if (prev > 0) {
        prMilestones.push({
          id: `pr-${r.id}`,
          at: r.completedAt,
          type: "pr_milestone",
          title: "Nowy rekord siłowy",
          description: `1RM: ${r.oneRMKg} kg (poprzedni ${prev} kg)`,
        });
      }
    }
  }
  events.push(...prMilestones.slice(-5));

  return events.sort((a, b) => b.at - a.at);
}
