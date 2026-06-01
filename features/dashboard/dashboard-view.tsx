"use client";

import { useMemo } from "react";

import { Reveal } from "@/components/shared/motion/reveal";
import { QuickAddWeightCard } from "@/features/metrics/quick-add-weight-card";
import {
  buildActivityCalendar,
  buildWeeklyTotals,
  buildWorkoutCounts,
} from "@/lib/stats-utils";
import { currentProgramWeek } from "@/lib/program-utils";
import {
  completedWorkoutIdsForWeek,
  currentLocalISODate,
  selectNextWorkout,
  selectUpcomingWorkouts,
  usePlanStore,
  useProfileStore,
  useSessionHistoryStore,
} from "@/store";
import { ActivityHeatmap } from "./components/activity-heatmap";
import { DashboardHeader } from "./components/dashboard-header";
import { LastWorkoutCard } from "./components/last-workout-card";
import { QuickActionsCard } from "./components/quick-actions-card";
import { TodayWorkoutCard } from "./components/today-workout-card";
import { TopPRsCard } from "./components/top-prs-card";
import { UpcomingCard } from "./components/upcoming-card";
import { WeeklyProgressCard } from "./components/weekly-progress-card";
import { WeeklyStatsCard } from "./components/weekly-stats-card";
import { WeightProgressCard } from "./components/weight-progress-card";
import { StatRow } from "./sections/stat-row";

/** Week-columns rendered in the activity heatmap. */
const ACTIVITY_WEEKS = 18;
/** Sensible default weekly target until the user sets one in their profile. */
const DEFAULT_WEEKLY_TARGET = 4;

export function DashboardView() {
  const plan = usePlanStore((s) => s.plan);
  const sessions = useSessionHistoryStore((s) => s.sessions);
  const profile = useProfileStore((s) => s.profile);

  const lastWorkout = useMemo(
    () => [...sessions].sort((a, b) => b.finishedAt - a.finishedAt)[0],
    [sessions],
  );
  // Pin "now" per mount so every derived widget agrees on the week boundary.
  const now = useMemo(() => new Date(), []);
  const todayISO = currentLocalISODate(now);
  const completedWorkoutIds = useMemo(
    () => completedWorkoutIdsForWeek(sessions, now),
    [sessions, now],
  );
  const nextWorkout = selectNextWorkout(plan, completedWorkoutIds, todayISO);
  const isTodayWorkout = nextWorkout?.date === todayISO;
  const programWeek = currentProgramWeek(profile, now);
  const upcoming = selectUpcomingWorkouts(plan, completedWorkoutIds, todayISO);
  const counts = useMemo(
    () => buildWorkoutCounts(sessions, now),
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
      <Reveal index={0}>
        <DashboardHeader />
      </Reveal>

      <Reveal index={1}>
        <QuickActionsCard />
      </Reveal>

      {/* Quick-glance KPI row */}
      <Reveal index={2}>
        <StatRow />
      </Reveal>

      {/* Hero: next workout (wide) + weekly goal ring */}
      <Reveal index={3}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TodayWorkoutCard
              workout={nextWorkout}
              isToday={isTodayWorkout}
              programWeek={programWeek}
            />
          </div>
          <WeeklyProgressCard done={counts.thisWeek} target={weeklyTarget} />
        </div>
      </Reveal>

      <Reveal index={4}>
        <WeightProgressCard />
      </Reveal>

      {/* Activity heatmap */}
      <Reveal index={5}>
        <ActivityHeatmap activity={activity} />
      </Reveal>

      {/* Detail row: last workout · weekly stats · quick weight */}
      <Reveal index={6}>
        <div className="grid gap-4 lg:grid-cols-3">
          <LastWorkoutCard session={lastWorkout} />
          <WeeklyStatsCard
            workouts={weekly.workouts}
            durationMin={weekly.durationMin}
            volumeKg={weekly.volumeKg}
            kcal={weekly.kcal}
          />
          <QuickAddWeightCard />
        </div>
      </Reveal>

      <Reveal index={7}>
        <TopPRsCard />
      </Reveal>

      <Reveal index={8}>
        <UpcomingCard items={upcoming} />
      </Reveal>
    </div>
  );
}
