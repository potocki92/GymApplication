"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

interface ChartPoint {
  date: string;
  value: number | null;
  sma: number | null;
}

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

  const data = useMemo<ChartPoint[]>(() => {
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

  const showGoalLine = metric === "weightKg" && goal != null;
  const unit = UNIT_BY_METRIC[metric];

  if (data.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
        <p className="text-sm font-medium">{t.metrics.noData}</p>
        <p className="text-xs text-muted-foreground">{t.metrics.noDataHint}</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={(iso: string) => formatShortWeekdayDatePL(iso)}
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            minTickGap={24}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            width={42}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            formatter={(value, name) => [`${value} ${unit}`, String(name)]}
            labelFormatter={(label) =>
              typeof label === "string" ? formatShortWeekdayDatePL(label) : ""
            }
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              fontSize: 12,
            }}
          />
          {showGoalLine && goal ? (
            <ReferenceLine
              y={goal.targetKg}
              stroke="#22c55e"
              strokeDasharray="4 4"
              label={{
                value: `${t.metrics.goal}: ${goal.targetKg} ${t.units.kg}`,
                position: "insideTopRight",
                fontSize: 11,
                fill: "#16a34a",
              }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="value"
            name={t.metrics.raw}
            stroke="#a78bfa"
            strokeWidth={1.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="sma"
            name={t.metrics.sma7}
            stroke="#7c3aed"
            strokeWidth={2.5}
            dot={false}
            activeDot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
