"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

/**
 * Catmull-Rom-ish smooth bezier through the points. Mirrors the curve used by
 * the dashboard mockup so sparklines and the volume chart share one feel.
 */
function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  const tension = 0.35;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

interface SparklineProps {
  /** Raw series, oldest → newest. Needs at least two points to render. */
  data: number[];
  /** Stroke/fill colour. Accepts any CSS colour incl. `var(--…)`. */
  color?: string;
  /** Draw the soft gradient area under the line. */
  filled?: boolean;
  className?: string;
}

const W = 200;
const H = 40;
const PAD_T = 6;
const PAD_B = 2;

/**
 * Tiny inline-SVG trend line — deliberately *not* Recharts, so a row of four
 * stat tiles stays cheap. Scales to its container via a `none` viewBox.
 */
export function Sparkline({
  data,
  color = "var(--primary)",
  filled = true,
  className,
}: SparklineProps) {
  const gradientId = useId();
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const innerH = H - PAD_T - PAD_B;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: PAD_T + innerH - ((v - min) / range) * innerH,
  }));

  const line = buildSmoothPath(points);
  const area = `${line} L ${points.at(-1)!.x} ${H} L ${points[0].x} ${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none block h-full w-full", className)}
    >
      {filled ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </svg>
  );
}
