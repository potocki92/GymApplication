"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Footprints } from "lucide-react";

import { DailyStepsChart } from "@/features/steps/components/daily-steps-chart";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatNumber } from "@/lib/format";
import { todaySteps } from "@/lib/steps-utils";
import { useStepsStore } from "@/store";

/** Liczba dni na kompaktowym wykresie kroków w Dashboardzie. */
const DASHBOARD_DAYS = 14;

export function StepsCard() {
  const t = useDictionary();
  const daily = useStepsStore((s) => s.daily);

  const chartData = useMemo(() => daily.slice(-DASHBOARD_DAYS), [daily]);
  const today = useMemo(() => todaySteps(daily), [daily]);
  const hasAny = daily.some((d) => d.steps > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Footprints className="size-4" />
          {t.steps.cardTitle}
        </CardTitle>
        {hasAny ? (
          <CardAction>
            <span className="font-heading text-lg font-bold tabular-nums">
              {formatNumber(today)}
            </span>{" "}
            <span className="text-xs text-muted-foreground">{t.steps.today}</span>
          </CardAction>
        ) : (
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href="/steps">{t.common.seeAll}</Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <DailyStepsChart data={chartData} heightClass="h-40" />
      </CardContent>
    </Card>
  );
}
