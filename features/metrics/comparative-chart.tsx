"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useDictionary } from "@/hooks/use-dictionary";
import { formatShortWeekdayDatePL } from "@/lib/format";
import { sortRecords } from "@/lib/metrics-utils";
import type { BodyMetricKey, BodyMetricRecord } from "@/types";

const UNIT_BY_METRIC: Record<BodyMetricKey, string> = {
  weightKg: "kg",
  chestCm: "cm",
  waistCm: "cm",
  hipsCm: "cm",
  bodyFatPct: "%",
};

interface Point {
  date: string;
  primary: number | null;
  secondary: number | null;
}

export function ComparativeChart({
  records,
  primary,
  secondary,
}: {
  records: BodyMetricRecord[];
  primary: BodyMetricKey;
  secondary: BodyMetricKey;
}) {
  const t = useDictionary();

  const data = useMemo<Point[]>(() => {
    const sorted = sortRecords(records);
    return sorted
      .filter((r) => {
        const a = r[primary];
        const b = r[secondary];
        return (
          (typeof a === "number" && Number.isFinite(a)) ||
          (typeof b === "number" && Number.isFinite(b))
        );
      })
      .map((r) => ({
        date: r.date,
        primary:
          typeof r[primary] === "number" && Number.isFinite(r[primary])
            ? (r[primary] as number)
            : null,
        secondary:
          typeof r[secondary] === "number" && Number.isFinite(r[secondary])
            ? (r[secondary] as number)
            : null,
      }));
  }, [records, primary, secondary]);

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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="date"
            tickFormatter={(iso: string) => formatShortWeekdayDatePL(iso)}
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
            stroke="rgba(255,255,255,0.2)"
            minTickGap={24}
          />
          <YAxis
            yAxisId="left"
            domain={["auto", "auto"]}
            tick={{ fontSize: 11, fill: "#C6FF3D" }}
            stroke="#C6FF3D"
            width={42}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={["auto", "auto"]}
            tick={{ fontSize: 11, fill: "#FF5722" }}
            stroke="#FF5722"
            width={42}
          />
          <Tooltip
            labelFormatter={(label) =>
              typeof label === "string" ? formatShortWeekdayDatePL(label) : ""
            }
            formatter={(value, _name, item) => {
              const dataKey = (item as { dataKey?: string })?.dataKey;
              const unit =
                dataKey === "primary"
                  ? UNIT_BY_METRIC[primary]
                  : UNIT_BY_METRIC[secondary];
              return [`${value} ${unit}`];
            }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#1a1a1a",
              color: "#ffffff",
              fontSize: 12,
            }}
            labelStyle={{ color: "rgba(255,255,255,0.7)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}
            formatter={(value) =>
              value === "primary"
                ? t.metrics.metricSelector[primary]
                : t.metrics.metricSelector[secondary]
            }
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="primary"
            stroke="#C6FF3D"
            strokeWidth={2}
            dot={{ r: 3, fill: "#C6FF3D" }}
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="secondary"
            stroke="#FF5722"
            strokeWidth={2}
            dot={{ r: 3, fill: "#FF5722" }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
