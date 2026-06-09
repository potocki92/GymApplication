"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarRange, Footprints, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatNumber } from "@/lib/format";
import {
  bestDaySteps,
  todaySteps,
  weeklyStepsAverage,
  weeklyStepsTotal,
} from "@/lib/steps-utils";
import { useStepsStore } from "@/store";
import { DailyStepsChart } from "./components/daily-steps-chart";

/** Liczba dni pokazywana na wykresie w widoku kroków. */
const CHART_DAYS = 30;

export function StepsView() {
  const t = useDictionary();
  const daily = useStepsStore((s) => s.daily);

  const chartData = useMemo(() => daily.slice(-CHART_DAYS), [daily]);
  const today = useMemo(() => todaySteps(daily), [daily]);
  const weeklyAvg = useMemo(() => weeklyStepsAverage(daily), [daily]);
  const weeklyTotal = useMemo(() => weeklyStepsTotal(daily), [daily]);
  const best = useMemo(() => bestDaySteps(daily), [daily]);
  const hasAny = best > 0;

  return (
    <div className="space-y-6">
      <PageHeader title={t.steps.title} description={t.steps.subtitle} />

      {hasAny ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <StatCard
                icon={Footprints}
                label={t.steps.today}
                value={formatNumber(today)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <StatCard
                icon={TrendingUp}
                label={t.steps.weeklyAvg}
                value={formatNumber(weeklyAvg)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <StatCard
                icon={CalendarRange}
                label={t.steps.weeklyTotal}
                value={formatNumber(weeklyTotal)}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t.steps.chartTitle}
          </CardTitle>
          <CardDescription>{t.steps.chartSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DailyStepsChart data={chartData} heightClass="h-64" />
          {!hasAny ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/integrations">
                <Footprints className="size-4" />
                {t.steps.connectCta}
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
