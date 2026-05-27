"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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
        {data.length < 2 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
            <p className="text-sm font-medium">{t.stats.strength.empty}</p>
            <p className="text-xs text-muted-foreground">
              {t.stats.strength.emptyHint}
            </p>
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
                />
                <Tooltip
                  formatter={(value) => [`${value} kg`, t.stats.strength.seriesName]}
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
                <Line
                  type="monotone"
                  dataKey="topOneRMKg"
                  name={t.stats.strength.seriesName}
                  stroke="var(--chart-2)"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: "var(--chart-2)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
