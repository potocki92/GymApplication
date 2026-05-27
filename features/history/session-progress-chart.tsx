"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useDictionary } from "@/hooks/use-dictionary";
import { formatShortWeekdayDatePL } from "@/lib/format";
import type { SessionHistoryRecord } from "@/types";

interface ChartPoint {
  date: string;
  finishedAt: number;
  volume: number;
  sma: number | null;
}

function epochToISODate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function sma(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    if (slice.length < Math.min(window, 3)) {
      out.push(null);
      continue;
    }
    const sum = slice.reduce((a, b) => a + b, 0);
    out.push(Math.round((sum / slice.length) * 10) / 10);
  }
  return out;
}

export function SessionProgressChart({
  sessions,
}: {
  sessions: SessionHistoryRecord[];
}) {
  const t = useDictionary();

  const data = useMemo<ChartPoint[]>(() => {
    const sorted = [...sessions].sort((a, b) => a.finishedAt - b.finishedAt);
    const volumes = sorted.map((s) => s.totalVolumeKg);
    const smaSeries = sma(volumes, 3);
    return sorted.map((s, i) => ({
      date: epochToISODate(s.finishedAt),
      finishedAt: s.finishedAt,
      volume: Math.round(s.totalVolumeKg * 10) / 10,
      sma: smaSeries[i],
    }));
  }, [sessions]);

  if (data.length < 2) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
        <p className="text-sm font-medium">{t.history.chart.empty}</p>
        <p className="text-xs text-muted-foreground">{t.history.chart.emptyHint}</p>
      </div>
    );
  }

  return (
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
            width={48}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            formatter={(value, name) => [`${value} ${t.units.kg}`, String(name)]}
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
            dataKey="volume"
            name={t.history.chart.volume}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={1.5}
            dot={{ r: 3, fill: "rgba(255,255,255,0.6)" }}
            activeDot={{ r: 5, fill: "#ffffff" }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="sma"
            name={t.history.chart.trend}
            stroke="#C6FF3D"
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
