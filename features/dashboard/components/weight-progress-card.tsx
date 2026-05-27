"use client";

import Link from "next/link";
import { Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDictionary } from "@/hooks/use-dictionary";
import { useMetricsStore, useProfileStore } from "@/store";

/**
 * Renders weight progress using the latest body-metric record (source of truth
 * for current weight) plus the profile's target. Falls back to empty / no-goal
 * states with CTAs into the right place to fix the missing data.
 */
export function WeightProgressCard() {
  const t = useDictionary();
  const profile = useProfileStore((s) => s.profile);
  const records = useMetricsStore((s) => s.records);

  const latest = records.length > 0 ? records[records.length - 1] : null;
  const currentWeight = latest?.weightKg ?? profile?.currentWeightKg ?? null;
  const start = profile?.currentWeightKg ?? null;
  const target = profile?.targetWeightKg ?? null;

  let pct: number | null = null;
  if (start != null && target != null && currentWeight != null && start !== target) {
    const denominator = target - start;
    const numerator = currentWeight - start;
    const raw = (numerator / denominator) * 100;
    pct = Math.max(0, Math.min(100, Math.round(raw)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Scale className="size-4 text-primary" />
          {t.dashboardWidgets.weightProgressTitle}
        </CardTitle>
        <CardAction>
          <Link
            href="/progress"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t.common.seeDetails}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentWeight == null ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t.dashboardWidgets.weightProgressEmpty}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/progress">{t.dashboardWidgets.quickLogWeight}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat
                label={t.dashboardWidgets.start}
                value={start != null ? `${start.toFixed(1)} kg` : "—"}
              />
              <Stat
                label={t.dashboardWidgets.current}
                value={`${currentWeight.toFixed(1)} kg`}
                accent
              />
              <Stat
                label={t.dashboardWidgets.target}
                value={target != null ? `${target.toFixed(1)} kg` : "—"}
              />
            </div>

            {pct != null ? (
              <div className="space-y-1.5">
                <Progress value={pct} />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t.dashboardWidgets.progressLabel}
                  </span>
                  <span className="font-semibold">{pct}%</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t.dashboardWidgets.weightProgressNoGoal}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          accent
            ? "font-heading text-lg font-semibold text-primary"
            : "font-heading text-lg font-semibold"
        }
      >
        {value}
      </div>
    </div>
  );
}
