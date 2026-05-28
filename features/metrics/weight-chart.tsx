"use client";

import { useMemo } from "react";

import {
  ProgressChart,
  type ProgressChartPoint,
} from "@/components/shared/progress-chart";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatShortWeekdayDatePL } from "@/lib/format";
import { sma7, sortRecords } from "@/lib/metrics-utils";
import type { BodyMetricGoal, BodyMetricKey, BodyMetricRecord } from "@/types";

const UNIT_BY_METRIC: Record<BodyMetricKey, string> = {
  weightKg: "kg",
  chestCm: "cm",
  waistCm: "cm",
  hipsCm: "cm",
  bodyFatPct: "%",
};

export function WeightChart({
  records,
  metric,
  goal,
}: {
  records: BodyMetricRecord[];
  metric: BodyMetricKey;
  goal?: BodyMetricGoal | null;
}) {
  const t = useDictionary();

  const data = useMemo<ProgressChartPoint[]>(() => {
    const sorted = sortRecords(records).filter(
      (r) => typeof r[metric] === "number" && Number.isFinite(r[metric]),
    );
    const smaSeries = sma7(sorted, metric);
    return sorted.map((r, i) => ({
      date: r.date,
      value: (r[metric] as number) ?? null,
      sma: Number.isFinite(smaSeries[i]) ? Math.round(smaSeries[i] * 10) / 10 : null,
    }));
  }, [records, metric]);

  const showGoal = metric === "weightKg" && goal != null;

  return (
    <ProgressChart
      data={data}
      rawLabel={t.metrics.raw}
      trendLabel={t.metrics.sma7}
      unit={UNIT_BY_METRIC[metric]}
      goal={
        showGoal && goal
          ? {
              value: goal.targetKg,
              label: `${t.metrics.goal}: ${goal.targetKg} ${t.units.kg}`,
            }
          : null
      }
      formatDate={formatShortWeekdayDatePL}
      emptyTitle={t.metrics.noData}
      emptyDescription={t.metrics.noDataHint}
    />
  );
}
