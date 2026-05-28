"use client";

import { useMemo } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { useDictionary } from "@/hooks/use-dictionary";
import {
  buildMeasurementDeltas,
  buildStrengthProgress,
  buildTimeline,
  buildWeeklyActivity,
  buildWeightSummary,
  buildWorkoutCounts,
  pickMotivation,
} from "@/lib/stats-utils";
import {
  useHistoryStore,
  useMetricsStore,
  useProfileStore,
  useSessionHistoryStore,
} from "@/store";

import { ActivityChart } from "./components/activity-chart";
import { GoalProgressHero } from "./components/goal-progress-hero";
import { MeasurementsCard } from "./components/measurements-card";
import { MotivationalBanner } from "./components/motivational-banner";
import { ProgressTimeline } from "./components/progress-timeline";
import { StrengthProgressChart } from "./components/strength-progress-chart";
import { WeightComparisonCard } from "./components/weight-comparison-card";
import { WeightTrendChart } from "./components/weight-trend-chart";
import { WorkoutCountsCard } from "./components/workout-counts-card";

export function StatsView() {
  const t = useDictionary();
  const profile = useProfileStore((s) => s.profile);
  const metrics = useMetricsStore((s) => s.records);
  const metricGoal = useMetricsStore((s) => s.goal);
  const sessions = useSessionHistoryStore((s) => s.sessions);
  const exerciseHistory = useHistoryStore((s) => s.records);

  const weightSummary = useMemo(
    () =>
      buildWeightSummary(
        metrics,
        metricGoal,
        profile?.currentWeightKg ?? null,
        profile?.targetWeightKg ?? null,
      ),
    [metrics, metricGoal, profile?.currentWeightKg, profile?.targetWeightKg],
  );
  const workoutCounts = useMemo(() => buildWorkoutCounts(sessions), [sessions]);
  const activity = useMemo(() => buildWeeklyActivity(sessions, 12), [sessions]);
  const measurements = useMemo(() => buildMeasurementDeltas(metrics), [metrics]);
  const strength = useMemo(
    () => buildStrengthProgress(exerciseHistory),
    [exerciseHistory],
  );
  const timeline = useMemo(
    () => buildTimeline(sessions, metrics, metricGoal, exerciseHistory),
    [sessions, metrics, metricGoal, exerciseHistory],
  );
  const motivation = useMemo(
    () => pickMotivation(weightSummary, workoutCounts),
    [weightSummary, workoutCounts],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t.stats.title} description={t.stats.subtitle} />

      <MotivationalBanner message={motivation} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeightComparisonCard summary={weightSummary} />
        </div>
        <div className="lg:col-span-1">
          <GoalProgressHero summary={weightSummary} />
        </div>
      </div>

      <WorkoutCountsCard counts={workoutCounts} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityChart data={activity} />
        <WeightTrendChart records={metrics} goal={metricGoal} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MeasurementsCard deltas={measurements} />
        <StrengthProgressChart data={strength} />
      </div>

      <ProgressTimeline events={timeline} />
    </div>
  );
}
