import { Clock, Dumbbell, Flame, Weight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatDurationLong, formatKcal, formatVolume } from "@/lib/format";
import type { WorkoutStats } from "@/types";

export function WeeklyStatsCard({ stats }: { stats: WorkoutStats }) {
  const t = useDictionary();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.dashboard.weeklyStats}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 lg:grid-cols-1">
        <StatCard
          icon={Dumbbell}
          label={t.dashboard.stats.workouts}
          value={String(stats.workoutsThisWeek)}
        />
        <StatCard
          icon={Clock}
          label={t.dashboard.stats.time}
          value={formatDurationLong(stats.totalDurationMin)}
        />
        <StatCard
          icon={Weight}
          label={t.dashboard.stats.volume}
          value={formatVolume(stats.totalVolumeKg)}
        />
        <StatCard
          icon={Flame}
          label={t.dashboard.stats.calories}
          value={formatKcal(stats.totalKcal)}
        />
      </CardContent>
    </Card>
  );
}
