"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useDictionary } from "@/hooks/use-dictionary";
import type {
  HeartRateSample,
  HeartRateZoneDefinition,
} from "@/types";

const ZONE_FILL: Record<HeartRateZoneDefinition["labelKey"], string> = {
  z1: "rgba(59, 130, 246, 0.10)",
  z2: "rgba(16, 185, 129, 0.10)",
  z3: "rgba(245, 158, 11, 0.10)",
  z4: "rgba(249, 115, 22, 0.12)",
  z5: "rgba(244, 63, 94, 0.14)",
};

interface ChartPoint {
  ts: number;
  bpm: number;
}

/**
 * Live BPM line over a rolling time window, with zone background bands.
 * Pure: every input comes through props so the same component renders mock
 * data in tests and live data in production without changes.
 *
 * The trailing-window filter belongs to the caller (typically
 * `selectHeartRateChartData(windowSec)`) — keeping it out of render makes
 * this component idempotent.
 */
export function LiveHeartRateChart({
  samples,
  zones,
}: {
  samples: HeartRateSample[];
  zones: HeartRateZoneDefinition[] | null;
}) {
  const t = useDictionary();

  const data = useMemo<ChartPoint[]>(
    () => samples.map((s) => ({ ts: s.ts, bpm: s.bpm })),
    [samples],
  );

  if (data.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
        <p className="text-sm font-medium">
          {t.activeWorkout.heartRate.chart.empty}
        </p>
      </div>
    );
  }

  const yDomain: [number, number] | undefined = zones
    ? [
        Math.min(zones[0]!.minBpm - 5, data[0]!.bpm - 5),
        Math.max(zones.at(-1)!.maxBpm + 5, data.at(-1)!.bpm + 5),
      ]
    : undefined;

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts: number) => formatClock(ts)}
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
            stroke="rgba(255,255,255,0.2)"
            minTickGap={32}
          />
          <YAxis
            domain={yDomain ?? ["auto", "auto"]}
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
            stroke="rgba(255,255,255,0.2)"
            width={36}
          />
          {zones?.map((z) => (
            <ReferenceArea
              key={z.zone}
              y1={z.minBpm}
              y2={z.maxBpm}
              fill={ZONE_FILL[z.labelKey]}
              stroke="none"
              ifOverflow="extendDomain"
            />
          ))}
          <Tooltip
            formatter={(value) => [`${value} bpm`, "HR"]}
            labelFormatter={(label) =>
              typeof label === "number" ? formatClock(label) : ""
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
            dataKey="bpm"
            stroke="#f43f5e"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Z1–Z5 chips with bpm ranges. Tiny enough to ship in the same file — no
 * separate component until proven necessary elsewhere.
 */
export function HrZoneLegend({
  zones,
  activeZone,
}: {
  zones: HeartRateZoneDefinition[] | null;
  activeZone: number | null;
}) {
  const t = useDictionary();
  if (!zones) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {zones.map((z) => {
        const isActive = z.zone === activeZone;
        return (
          <div
            key={z.zone}
            className={[
              "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] tabular-nums ring-1",
              z.color.bg,
              z.color.fg,
              isActive ? z.color.ring : "ring-transparent",
            ].join(" ")}
          >
            <span className="font-semibold">
              {t.activeWorkout.heartRate.zones[z.labelKey]}
            </span>
            <span className="text-muted-foreground">
              {z.minBpm}–{z.maxBpm}
            </span>
          </div>
        );
      })}
    </div>
  );
}
