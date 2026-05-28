"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartContainer } from "@/components/shared/chart/chart-container";
import {
  CHART_AXIS_PROPS,
  CHART_COLORS,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_PROPS,
} from "@/components/shared/chart/chart-theme";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatShortWeekdayDatePL } from "@/lib/format";
import { sortRecords } from "@/lib/metrics-utils";
import type { BodyMetricGoal, BodyMetricRecord } from "@/types";

interface Point {
  date: string;
  weightKg: number;
}

export function WeightTrendChart({
  records,
  goal,
}: {
  records: BodyMetricRecord[];
  goal: BodyMetricGoal | null;
}) {
  const t = useDictionary();

  const data = useMemo<Point[]>(() => {
    return sortRecords(records)
      .filter((r) => typeof r.weightKg === "number" && Number.isFinite(r.weightKg))
      .map((r) => ({ date: r.date, weightKg: Math.round(r.weightKg * 10) / 10 }));
  }, [records]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.stats.weightTrend.title}
        </CardTitle>
        <CardDescription>{t.stats.weightTrend.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          heightClass="h-64"
          isEmpty={data.length < 2}
          emptyTitle={t.stats.weightTrend.empty}
          emptyDescription={t.stats.weightTrend.emptyHint}
        >
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              {...CHART_AXIS_PROPS}
              dataKey="date"
              tickFormatter={(iso: string) => formatShortWeekdayDatePL(iso)}
              minTickGap={24}
            />
            <YAxis {...CHART_AXIS_PROPS} domain={["auto", "auto"]} width={42} />
            <Tooltip
              {...CHART_TOOLTIP_PROPS}
              formatter={(value) => [`${value} kg`, t.stats.weightTrend.seriesWeight]}
              labelFormatter={(label) =>
                typeof label === "string" ? formatShortWeekdayDatePL(label) : ""
              }
            />
            {goal ? (
              <ReferenceLine
                y={goal.targetKg}
                stroke={CHART_COLORS.goal}
                strokeDasharray="4 4"
                label={{
                  value: `${t.stats.weightTrend.seriesGoal}: ${goal.targetKg} kg`,
                  position: "insideTopRight",
                  fontSize: 11,
                  fill: CHART_COLORS.goal,
                }}
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="weightKg"
              name={t.stats.weightTrend.seriesWeight}
              stroke={CHART_COLORS.primary}
              strokeWidth={2.5}
              fill="url(#weightFill)"
              dot={{ r: 2.5, fill: CHART_COLORS.primary }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
