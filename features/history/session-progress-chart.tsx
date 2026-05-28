"use client";

import { useMemo } from "react";

import {
  ProgressChart,
  type ProgressChartPoint,
} from "@/components/shared/progress-chart";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatShortWeekdayDatePL } from "@/lib/format";
import type { SessionHistoryRecord } from "@/types";

function epochToISODate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function sma(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    if (slice.length < Math.min(window, 3)) {
      out.push(null);
      continue;
    }
    const sum = slice.reduce((a, b) => a + b, 0);
    out.push(Math.round((sum / slice.length) * 10) / 10);
  }
  return out;
}

export function SessionProgressChart({
  sessions,
}: {
  sessions: SessionHistoryRecord[];
}) {
  const t = useDictionary();

  const data = useMemo<ProgressChartPoint[]>(() => {
    const sorted = [...sessions].sort((a, b) => a.finishedAt - b.finishedAt);
    const volumes = sorted.map((s) => s.totalVolumeKg);
    const smaSeries = sma(volumes, 3);
    return sorted.map((s, i) => ({
      date: epochToISODate(s.finishedAt),
      value: Math.round(s.totalVolumeKg * 10) / 10,
      sma: smaSeries[i],
    }));
  }, [sessions]);

  return (
    <ProgressChart
      data={data}
      isEmpty={data.length < 2}
      rawLabel={t.history.chart.volume}
      trendLabel={t.history.chart.trend}
      unit={t.units.kg}
      formatDate={formatShortWeekdayDatePL}
      heightClass="h-56"
      yAxisWidth={48}
      emptyTitle={t.history.chart.empty}
      emptyDescription={t.history.chart.emptyHint}
    />
  );
}
