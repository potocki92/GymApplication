"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

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
import type { WeeklyActivityPoint } from "@/lib/stats-utils";

export function ActivityChart({ data }: { data: WeeklyActivityPoint[] }) {
  const t = useDictionary();
  const hasAny = data.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.stats.activity.title}
        </CardTitle>
        <CardDescription>{t.stats.activity.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          heightClass="h-56"
          isEmpty={!hasAny}
          emptyTitle={t.stats.activity.empty}
          emptyDescription={t.stats.activity.emptyHint}
        >
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...CHART_GRID_PROPS} vertical={false} />
            <XAxis {...CHART_AXIS_PROPS} dataKey="label" interval="preserveStartEnd" />
            <YAxis {...CHART_AXIS_PROPS} allowDecimals={false} width={28} />
            <Tooltip
              {...CHART_TOOLTIP_PROPS}
              cursor={{ fill: "rgba(198, 255, 61, 0.08)" }}
              formatter={(value) => [String(value), t.stats.activity.barName]}
            />
            <Bar
              dataKey="count"
              name={t.stats.activity.barName}
              fill={CHART_COLORS.primary}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
