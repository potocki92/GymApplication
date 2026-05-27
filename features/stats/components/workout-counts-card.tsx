"use client";

import { CalendarRange, Dumbbell, TrendingDown, TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import type { WorkoutCounts } from "@/lib/stats-utils";
import { cn } from "@/lib/utils";

export function WorkoutCountsCard({ counts }: { counts: WorkoutCounts }) {
  const t = useDictionary();
  const { total, thisWeek, thisMonth, last30Days, trendPct } = counts;

  let trendLabel: string;
  let trendAccent: "success" | "destructive" | "default" = "default";
  let TrendIcon = TrendingUp;
  if (trendPct == null) {
    trendLabel = t.stats.counts.trendNew;
    TrendIcon = TrendingUp;
  } else if (trendPct > 0) {
    trendLabel = t.stats.counts.trendUp.replace("{pct}", String(trendPct));
    trendAccent = "success";
    TrendIcon = TrendingUp;
  } else if (trendPct < 0) {
    trendLabel = t.stats.counts.trendDown.replace("{pct}", String(Math.abs(trendPct)));
    trendAccent = "destructive";
    TrendIcon = TrendingDown;
  } else {
    trendLabel = t.stats.counts.trendFlat;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Dumbbell className="size-4 text-primary" />
          {t.stats.counts.title}
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-xs">
          <TrendIcon
            className={cn(
              "size-3.5",
              trendAccent === "success" && "text-success",
              trendAccent === "destructive" && "text-destructive",
            )}
          />
          <span
            className={cn(
              trendAccent === "success" && "text-success",
              trendAccent === "destructive" && "text-destructive",
            )}
          >
            {trendLabel}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cell label={t.stats.counts.total} value={total} />
        <Cell label={t.stats.counts.week} value={thisWeek} highlight />
        <Cell label={t.stats.counts.month} value={thisMonth} />
        <Cell label={t.stats.counts.last30} value={last30Days} icon={CalendarRange} />
      </CardContent>
    </Card>
  );
}

function Cell({
  label,
  value,
  highlight,
  icon: Icon,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  icon?: typeof CalendarRange;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="size-3" /> : null}
        <span className="truncate">{label}</span>
      </div>
      <p
        className={cn(
          "font-heading text-2xl font-bold tabular-nums leading-none",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
