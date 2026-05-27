"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
        {!hasAny ? (
          <div className="flex h-56 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
            <p className="text-sm font-medium">{t.stats.activity.empty}</p>
            <p className="text-xs text-muted-foreground">
              {t.stats.activity.emptyHint}
            </p>
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                  stroke="rgba(255,255,255,0.2)"
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                  stroke="rgba(255,255,255,0.2)"
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: "rgba(198, 255, 61, 0.08)" }}
                  formatter={(value) => [String(value), t.stats.activity.barName]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "#1a1a1a",
                    color: "#ffffff",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                />
                <Bar
                  dataKey="count"
                  name={t.stats.activity.barName}
                  fill="var(--chart-1)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
