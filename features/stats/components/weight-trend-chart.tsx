"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
        {data.length < 2 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
            <p className="text-sm font-medium">{t.stats.weightTrend.empty}</p>
            <p className="text-xs text-muted-foreground">
              {t.stats.weightTrend.emptyHint}
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(iso: string) => formatShortWeekdayDatePL(iso)}
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                  stroke="rgba(255,255,255,0.2)"
                  minTickGap={24}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                  stroke="rgba(255,255,255,0.2)"
                  width={42}
                  tickFormatter={(v: number) => `${v}`}
                />
                <Tooltip
                  formatter={(value) => [`${value} kg`, t.stats.weightTrend.seriesWeight]}
                  labelFormatter={(label) =>
                    typeof label === "string" ? formatShortWeekdayDatePL(label) : ""
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "#1a1a1a",
                    color: "#ffffff",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                />
                {goal ? (
                  <ReferenceLine
                    y={goal.targetKg}
                    stroke="var(--chart-2)"
                    strokeDasharray="4 4"
                    label={{
                      value: `${t.stats.weightTrend.seriesGoal}: ${goal.targetKg} kg`,
                      position: "insideTopRight",
                      fontSize: 11,
                      fill: "var(--chart-2)",
                    }}
                  />
                ) : null}
                <Area
                  type="monotone"
                  dataKey="weightKg"
                  name={t.stats.weightTrend.seriesWeight}
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#weightFill)"
                  dot={{ r: 2.5, fill: "var(--chart-1)" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
