"use client";

import Link from "next/link";

import { SectionHeader } from "@/components/shared/section-header";
import { ACTIVITY, CURRENT_USER, TRAINING_GOAL, WORKOUT_STATS } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import {
  selectLastWorkout,
  selectNextWorkout,
  selectUpcomingDays,
  usePlanStore,
} from "@/store";
import { WeeklyPlan } from "@/features/plan/components/weekly-plan";
import { ActivityHeatmap } from "./components/activity-heatmap";
import { DashboardHeader } from "./components/dashboard-header";
import { GoalCard } from "./components/goal-card";
import { LastWorkoutCard } from "./components/last-workout-card";
import { NextWorkoutCard } from "./components/next-workout-card";
import { StreakCard } from "./components/streak-card";
import { TopPRsCard } from "./components/top-prs-card";
import { UpcomingWorkoutsCard } from "./components/upcoming-workouts-card";
import { WeeklyProgressCard } from "./components/weekly-progress-card";
import { WeeklyStatsCard } from "./components/weekly-stats-card";

export function DashboardView() {
  const t = useDictionary();
  const plan = usePlanStore((s) => s.plan);

  const lastWorkout = selectLastWorkout(plan);
  const nextWorkout = selectNextWorkout(plan);
  const upcoming = selectUpcomingDays(plan);

  return (
    <div className="space-y-6">
      <DashboardHeader user={CURRENT_USER} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GoalCard goal={TRAINING_GOAL} />
        <WeeklyProgressCard
          done={WORKOUT_STATS.workoutsThisWeek}
          target={WORKOUT_STATS.workoutsTarget}
        />
        <div className="sm:col-span-2 lg:col-span-1">
          <StreakCard days={WORKOUT_STATS.currentStreakDays} />
        </div>

        <div className="sm:col-span-2 lg:col-span-2">
          <ActivityHeatmap activity={ACTIVITY} />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <UpcomingWorkoutsCard days={upcoming} weekStart={plan.weekStart} />
        </div>

        <LastWorkoutCard workout={lastWorkout} />
        <NextWorkoutCard workout={nextWorkout} />
        <div className="sm:col-span-2 lg:col-span-1">
          <WeeklyStatsCard stats={WORKOUT_STATS} />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <TopPRsCard />
        </div>
      </div>

      <section className="space-y-3">
        <SectionHeader
          title={t.dashboard.weeklyPlan}
          action={
            <Link href="/plan" className="text-sm font-medium text-primary hover:underline">
              {t.dashboard.seeFullPlan}
            </Link>
          }
        />
        <WeeklyPlan />
      </section>
    </div>
  );
}
