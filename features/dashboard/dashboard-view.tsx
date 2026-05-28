"use client";

import Link from "next/link";
import { useMemo } from "react";

import { SectionHeader } from "@/components/shared/section-header";
import { QuickAddWeightCard } from "@/features/metrics/quick-add-weight-card";
import { WeeklyPlan } from "@/features/plan/components/weekly-plan";
import { useDictionary } from "@/hooks/use-dictionary";
import {
  buildActivityCalendar,
  buildWeeklyTotals,
  buildWorkoutCounts,
  buildWorkoutStreak,
} from "@/lib/stats-utils";
import {
  selectNextWorkout,
  usePlanStore,
  useProfileStore,
  useSessionHistoryStore,
} from "@/store";
import { ActivityHeatmap } from "./components/activity-heatmap";
import { DashboardHeader } from "./components/dashboard-header";
import { GoalCard } from "./components/goal-card";
import { LastWorkoutCard } from "./components/last-workout-card";
import { NextWorkoutCard } from "./components/next-workout-card";
import { QuickActionsCard } from "./components/quick-actions-card";
import { StreakCard } from "./components/streak-card";
import { TopPRsCard } from "./components/top-prs-card";
import { WeeklyProgressCard } from "./components/weekly-progress-card";
import { WeeklyStatsCard } from "./components/weekly-stats-card";
import { WeightProgressCard } from "./components/weight-progress-card";

/** Week-columns rendered in the activity heatmap. */
const ACTIVITY_WEEKS = 18;
/** Sensible default weekly target until the user sets one in their profile. */
const DEFAULT_WEEKLY_TARGET = 4;

export function DashboardView() {
  const t = useDictionary();
  const plan = usePlanStore((s) => s.plan);
  const sessions = useSessionHistoryStore((s) => s.sessions);
  const profile = useProfileStore((s) => s.profile);

  const lastWorkout = useMemo(
    () => [...sessions].sort((a, b) => b.finishedAt - a.finishedAt)[0],
    [sessions],
  );
  const nextWorkout = selectNextWorkout(plan);

  // Pin "now" per mount so every derived widget agrees on the week boundary.
  const now = useMemo(() => new Date(), []);
  const counts = useMemo(
    () => buildWorkoutCounts(sessions, now),
    [sessions, now],
  );
  const streak = useMemo(
    () => buildWorkoutStreak(sessions, now),
    [sessions, now],
  );
  const weekly = useMemo(
    () => buildWeeklyTotals(sessions, now),
    [sessions, now],
  );
  const activity = useMemo(
    () => buildActivityCalendar(sessions, ACTIVITY_WEEKS, now),
    [sessions, now],
  );
  const weeklyTarget = profile?.trainingDaysPerWeek ?? DEFAULT_WEEKLY_TARGET;

  return (
    <div className="space-y-6">
      <DashboardHeader />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <QuickActionsCard />
        </div>

        <div className="sm:col-span-2 lg:col-span-2">
          <WeightProgressCard />
        </div>
        <GoalCard />

        <WeeklyProgressCard done={counts.thisWeek} target={weeklyTarget} />
        <div className="sm:col-span-2 lg:col-span-1">
          <StreakCard days={streak} />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <ActivityHeatmap activity={activity} />
        </div>

        <LastWorkoutCard session={lastWorkout} />
        <NextWorkoutCard workout={nextWorkout} />
        <div className="sm:col-span-2 lg:col-span-1">
          <WeeklyStatsCard
            workouts={weekly.workouts}
            durationMin={weekly.durationMin}
            volumeKg={weekly.volumeKg}
            kcal={weekly.kcal}
          />
        </div>

        <QuickAddWeightCard />
        <div className="sm:col-span-2 lg:col-span-2">
          <TopPRsCard />
        </div>
      </div>

      <section className="space-y-3">
        <SectionHeader
          title={t.dashboard.weeklyPlan}
          action={
            <Link
              href="/plan"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t.dashboard.seeFullPlan}
            </Link>
          }
        />
        <WeeklyPlan />
      </section>
    </div>
  );
}
