"use client";

import Link from "next/link";
import { Target } from "lucide-react";

import { ProgressRing } from "@/components/shared/progress-ring";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDictionary } from "@/hooks/use-dictionary";
import { progressTier } from "@/lib/metrics-utils";
import type { WeightSummary } from "@/lib/stats-utils";
import { cn } from "@/lib/utils";

export function GoalProgressHero({ summary }: { summary: WeightSummary }) {
  const t = useDictionary();
  const pct = summary.progressPct;

  if (pct == null) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Target className="size-4" />
            {t.stats.goal.title}
          </CardTitle>
          <CardDescription>{t.stats.goal.noGoal}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t.stats.goal.noGoalCta}</p>
          <Button asChild size="sm">
            <Link href="/progress">{t.stats.cta.setGoal}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tier = progressTier(pct);
  const tierIndicator: Record<typeof tier, string> = {
    ahead: "[&>[data-slot=progress-indicator]]:bg-success",
    "on-track": "[&>[data-slot=progress-indicator]]:bg-primary",
    behind: "[&>[data-slot=progress-indicator]]:bg-warning",
  };
  const tierRingClass: Record<typeof tier, string> = {
    ahead: "[&_circle:last-child]:stroke-success",
    "on-track": "[&_circle:last-child]:stroke-primary",
    behind: "[&_circle:last-child]:stroke-warning",
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="size-4" />
          {t.stats.goal.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-around">
        <ProgressRing
          value={pct / 100}
          size={132}
          strokeWidth={12}
          className={tierRingClass[tier]}
        >
          <span className="font-heading text-3xl font-bold leading-none tabular-nums">
            {Math.round(pct)}%
          </span>
          <span className="mt-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            {t.stats.goal.ofGoal}
          </span>
        </ProgressRing>
        <div className="flex w-full max-w-xs flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.stats.weight.start}</span>
            <span className="font-heading font-semibold tabular-nums">
              {summary.startKg?.toFixed(1) ?? "—"} kg
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.stats.weight.current}</span>
            <span className="font-heading font-semibold tabular-nums text-primary">
              {summary.currentKg?.toFixed(1) ?? "—"} kg
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.stats.weight.target}</span>
            <span className="font-heading font-semibold tabular-nums">
              {summary.targetKg?.toFixed(1) ?? "—"} kg
            </span>
          </div>
          <Progress
            value={pct}
            className={cn("mt-2 h-2", tierIndicator[tier])}
          />
        </div>
      </CardContent>
    </Card>
  );
}
