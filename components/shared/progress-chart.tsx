"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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

export interface ProgressChartPoint {
  date: string;
  value: number | null;
  sma?: number | null;
}

interface ProgressChartProps {
  data: ProgressChartPoint[];
  rawLabel: string;
  trendLabel?: string;
  unit?: string;
  goal?: { value: number; label: string } | null;
  /** Formats the x-axis tick and tooltip label from the point's `date`. */
  formatDate?: (date: string) => string;
  heightClass?: string;
  yAxisWidth?: number;
  /** Overrides the default empty check (no data points). */
  isEmpty?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
}

export function ProgressChart({
  data,
  rawLabel,
  trendLabel,
  unit,
  goal,
  formatDate,
  heightClass = "h-72",
  yAxisWidth = 42,
  isEmpty,
  emptyTitle,
  emptyDescription,
}: ProgressChartProps) {
  const hasTrend = data.some((d) => d.sma != null);
  const suffix = unit ? ` ${unit}` : "";

  return (
    <ChartContainer
      heightClass={heightClass}
      isEmpty={isEmpty ?? data.length === 0}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    >
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid {...CHART_GRID_PROPS} />
        <XAxis
          {...CHART_AXIS_PROPS}
          dataKey="date"
          tickFormatter={formatDate ? (iso: string) => formatDate(iso) : undefined}
          minTickGap={24}
        />
        <YAxis {...CHART_AXIS_PROPS} domain={["auto", "auto"]} width={yAxisWidth} />
        <Tooltip
          {...CHART_TOOLTIP_PROPS}
          formatter={(value, name) => [`${value}${suffix}`, String(name)]}
          labelFormatter={(label) =>
            formatDate && typeof label === "string" ? formatDate(label) : String(label ?? "")
          }
        />
        {goal ? (
          <ReferenceLine
            y={goal.value}
            stroke={CHART_COLORS.goal}
            strokeDasharray="4 4"
            label={{
              value: goal.label,
              position: "insideTopRight",
              fontSize: 11,
              fill: CHART_COLORS.goal,
            }}
          />
        ) : null}
        <Line
          type="monotone"
          dataKey="value"
          name={rawLabel}
          stroke={CHART_COLORS.raw}
          strokeWidth={1.5}
          dot={{ r: 3, fill: CHART_COLORS.rawDot }}
          activeDot={{ r: 5, fill: CHART_COLORS.rawActiveDot }}
          connectNulls
        />
        {hasTrend ? (
          <Line
            type="monotone"
            dataKey="sma"
            name={trendLabel}
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            dot={false}
            activeDot={false}
            connectNulls
          />
        ) : null}
      </LineChart>
    </ChartContainer>
  );
}
