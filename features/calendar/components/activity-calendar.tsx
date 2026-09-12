"use client";

import { useMemo } from "react";
import { Calendar, Flame, Trophy } from "lucide-react";

import { ActivityHeatmapGrid } from "@/components/shared/activity-heatmap";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
import { StatValue } from "@/components/shared/stat-value";
import { useDictionary } from "@/hooks/use-dictionary";
import {
  buildActivityCalendar,
  buildLongestStreak,
  buildWorkoutStreak,
  countSessionsInWeeks,
} from "@/lib/stats-utils";
import type { SessionHistoryRecord } from "@/types";

const ACTIVITY_WEEKS = 52;

export function ActivityCalendar({
  sessions,
}: {
  sessions: SessionHistoryRecord[];
}) {
  const t = useDictionary();

  const activity = useMemo(
    () => buildActivityCalendar(sessions, ACTIVITY_WEEKS),
    [sessions],
  );
  const currentStreak = useMemo(() => buildWorkoutStreak(sessions), [sessions]);
  const longestStreak = useMemo(() => buildLongestStreak(sessions), [sessions]);
  const total = useMemo(
    () => countSessionsInWeeks(sessions, ACTIVITY_WEEKS),
    [sessions],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={Flame}
          label={t.calendar.streak.current}
          value={<StatValue value={currentStreak} tone="data" />}
          hint={t.calendar.streak.unit}
        />
        <MetricCard
          icon={Trophy}
          label={t.calendar.streak.longest}
          value={<StatValue value={longestStreak} />}
          hint={t.calendar.streak.unit}
        />
        <MetricCard
          icon={Calendar}
          label={t.calendar.streak.total}
          value={<StatValue value={total} />}
          hint={t.calendar.streak.workoutsUnit}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t.calendar.activity.title}
          </CardTitle>
          <CardDescription>{t.calendar.activity.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityHeatmapGrid activity={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
