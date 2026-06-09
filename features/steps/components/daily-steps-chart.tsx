"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { ChartContainer } from "@/components/shared/chart/chart-container";
import {
  CHART_AXIS_PROPS,
  CHART_COLORS,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_PROPS,
} from "@/components/shared/chart/chart-theme";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatNumber, formatShortWeekdayDatePL } from "@/lib/format";
import type { DailyStepsPoint } from "@/types";

interface DailyStepsChartProps {
  data: DailyStepsPoint[];
  heightClass?: string;
}

export function DailyStepsChart({ data, heightClass = "h-56" }: DailyStepsChartProps) {
  const t = useDictionary();
  const hasAny = data.some((d) => d.steps > 0);

  return (
    <ChartContainer
      heightClass={heightClass}
      isEmpty={!hasAny}
      emptyTitle={t.steps.empty}
      emptyDescription={t.steps.emptyHint}
    >
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid {...CHART_GRID_PROPS} vertical={false} />
        <XAxis
          {...CHART_AXIS_PROPS}
          dataKey="date"
          interval="preserveStartEnd"
          minTickGap={24}
          tickFormatter={(iso: string) => formatShortWeekdayDatePL(iso)}
        />
        <YAxis
          {...CHART_AXIS_PROPS}
          allowDecimals={false}
          width={40}
          tickFormatter={(value: number) => formatNumber(value)}
        />
        <Tooltip
          {...CHART_TOOLTIP_PROPS}
          cursor={{ fill: "rgba(198, 255, 61, 0.08)" }}
          labelFormatter={(iso) => formatShortWeekdayDatePL(String(iso))}
          formatter={(value) => [formatNumber(Number(value)), t.steps.barName]}
        />
        <Bar
          dataKey="steps"
          name={t.steps.barName}
          fill={CHART_COLORS.primary}
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
