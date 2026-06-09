import type { DailyStepsPoint, Goal, SessionHistoryRecord } from "@/types";

import { todaySteps, weeklyStepsTotal } from "./steps-utils";
import { buildWorkoutCounts, type WeightSummary } from "./stats-utils";

export interface GoalProgress {
  current: number;
  target: number;
  /** 0–100 postępu do celu; 0 gdy target ≤ 0. */
  progressPct: number;
  achieved: boolean;
}

/** Jednolity postęp z wartości bieżącej i docelowej. */
export function computeProgress(current: number, target: number): GoalProgress {
  if (!Number.isFinite(target) || target <= 0) {
    return { current, target, progressPct: 0, achieved: false };
  }
  const progressPct = Math.max(0, Math.min(100, Math.round((current / target) * 100)));
  return { current, target, progressPct, achieved: current >= target };
}

/** Dane potrzebne do policzenia postępu celów liczonych automatycznie. */
export interface GoalContext {
  sessions: readonly SessionHistoryRecord[];
  daily: readonly DailyStepsPoint[];
}

/** Postęp dla konkretnego celu na podstawie istniejących danych. */
export function goalProgress(
  goal: Goal,
  ctx: GoalContext,
  now: Date = new Date(),
): GoalProgress {
  switch (goal.type) {
    case "workouts_weekly": {
      const current = buildWorkoutCounts(ctx.sessions as SessionHistoryRecord[], now).thisWeek;
      return computeProgress(current, goal.target);
    }
    case "steps_daily":
      return computeProgress(todaySteps(ctx.daily, now), goal.target);
    case "steps_weekly":
      return computeProgress(weeklyStepsTotal(ctx.daily, now), goal.target);
  }
}

/** Opakowuje istniejące `WeightSummary` w jednolity `GoalProgress`. */
export function computeWeightGoalProgress(summary: WeightSummary): GoalProgress {
  const target = summary.targetKg ?? 0;
  const current = summary.currentKg ?? 0;
  const progressPct = summary.progressPct ?? 0;
  return {
    current,
    target,
    progressPct,
    achieved: progressPct >= 100,
  };
}
