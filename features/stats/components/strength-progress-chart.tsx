"use client";

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

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
import type { StrengthProgressPoint } from "@/lib/stats-utils";

export function StrengthProgressChart({
  data,
}: {
  data: StrengthProgressPoint[];
}) {
  const t = useDictionary();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.stats.strength.title}
        </CardTitle>
        <CardDescription>{t.stats.strength.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          heightClass="h-56"
          isEmpty={data.length < 2}
          emptyTitle={t.stats.strength.empty}
          emptyDescription={t.stats.strength.emptyHint}
        >
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
              formatter={(value) => [`${value} kg`, t.stats.strength.seriesName]}
              labelFormatter={(label) =>
                typeof label === "string" ? formatShortWeekdayDatePL(label) : ""
              }
            />
            <Line
              type="monotone"
              dataKey="topOneRMKg"
              name={t.stats.strength.seriesName}
              stroke={CHART_COLORS.secondary}
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: CHART_COLORS.secondary }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
