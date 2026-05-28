"use client";

import Link from "next/link";
import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDictionary } from "@/hooks/use-dictionary";
import { progressTier } from "@/lib/metrics-utils";
import { buildWeightSummary } from "@/lib/stats-utils";
import { cn } from "@/lib/utils";
import { useMetricsStore, useProfileStore } from "@/store";

export function GoalProgressCard() {
  const t = useDictionary();
  const records = useMetricsStore((s) => s.records);
  const profile = useProfileStore((s) => s.profile);

  const summary = buildWeightSummary(
    records,
    null,
    profile?.currentWeightKg ?? null,
    profile?.targetWeightKg ?? null,
  );
  const pct = summary.progressPct ?? 0;
  const tier = progressTier(pct);

  const tierColor: Record<string, string> = {
    ahead: "bg-success/15 text-success",
    "on-track": "bg-primary/15 text-primary",
    behind: "bg-destructive/15 text-destructive",
  };
  const tierIndicator: Record<string, string> = {
    ahead: "[&>[data-slot=progress-indicator]]:bg-success",
    "on-track": "[&>[data-slot=progress-indicator]]:bg-primary",
    behind: "[&>[data-slot=progress-indicator]]:bg-destructive",
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="size-4" />
          {t.metrics.goalSection.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary.targetKg != null ? (
          <>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="font-heading text-2xl font-bold tabular-nums">
                  {summary.currentKg != null
                    ? `${summary.currentKg.toFixed(1)} ${t.units.kg}`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {summary.startKg != null
                    ? `${summary.startKg.toFixed(1)}`
                    : "—"}{" "}
                  → {summary.targetKg.toFixed(1)} {t.units.kg}
                </p>
              </div>
              {summary.progressPct != null ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                    tierColor[tier],
                  )}
                >
                  {summary.progressPct}%
                </span>
              ) : null}
            </div>
            {summary.progressPct != null ? (
              <Progress
                value={summary.progressPct}
                className={cn("h-2", tierIndicator[tier])}
              />
            ) : null}
            <p className="text-xs text-muted-foreground">
              {t.metrics.goalSection.settingsSource}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/settings">
                {t.metrics.goalSection.editInSettings}
              </Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t.metrics.goalSection.noGoal}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.metrics.goalSection.settingsSource}
            </p>
            <Button asChild size="sm">
              <Link href="/settings">
                <Target className="size-4" />
                {t.metrics.goalSection.setInSettings}
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
