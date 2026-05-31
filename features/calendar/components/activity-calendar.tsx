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
import { StatTile } from "@/features/stats/components/stat-tile";
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
        <StatTile
          icon={Flame}
          label={t.calendar.streak.current}
          value={currentStreak}
          hint={t.calendar.streak.unit}
          accent="primary"
        />
        <StatTile
          icon={Trophy}
          label={t.calendar.streak.longest}
          value={longestStreak}
          hint={t.calendar.streak.unit}
          accent="success"
        />
        <StatTile
          icon={Calendar}
          label={t.calendar.streak.total}
          value={total}
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
