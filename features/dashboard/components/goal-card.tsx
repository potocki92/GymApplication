"use client";

import Link from "next/link";
import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDictionary } from "@/hooks/use-dictionary";
import { buildWeightSummary } from "@/lib/stats-utils";
import { useMetricsStore, useProfileStore } from "@/store";

export function GoalCard() {
  const t = useDictionary();
  const profile = useProfileStore((s) => s.profile);
  const records = useMetricsStore((s) => s.records);
  const goal = useMetricsStore((s) => s.goal);

  const summary = buildWeightSummary(
    records,
    goal,
    profile?.currentWeightKg ?? null,
    profile?.targetWeightKg ?? null,
  );

  const hasGoal = summary.progressPct != null && summary.targetKg != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="size-4 text-primary" />
          {t.metrics.goalSection.title}
        </CardTitle>
        <CardAction>
          <Link href="/progress" className="text-sm font-medium text-primary hover:underline">
            {t.common.edit}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasGoal ? (
          <>
            <p className="font-heading text-base font-semibold">
              {summary.currentKg?.toFixed(1)} {t.units.kg}
              <span className="ml-2 text-sm font-medium text-muted-foreground">
                / {summary.targetKg?.toFixed(1)} {t.units.kg}
              </span>
            </p>
            <div className="space-y-1.5">
              <Progress value={summary.progressPct ?? 0} />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {summary.direction === "bulk"
                    ? t.stats.weight.directionBulk
                    : t.stats.weight.directionCut}
                </span>
                <span className="font-semibold">{summary.progressPct}%</span>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t.dashboardWidgets.weightProgressNoGoal}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/progress">{t.stats.cta.setGoal}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
