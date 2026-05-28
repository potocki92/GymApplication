import type { CSSProperties } from "react"

/**
 * Shared recharts styling for the dark "Athletic Brutalism" canvas. Keeping grid,
 * axis and tooltip config in one place stops each chart re-deriving slightly
 * different values. Data-series colors reference the `--chart-*` design tokens.
 */

export const CHART_GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: "rgba(255,255,255,0.08)",
}

export const CHART_AXIS_PROPS = {
  tick: { fontSize: 11, fill: "rgba(255,255,255,0.6)" },
  stroke: "rgba(255,255,255,0.2)",
}

export const CHART_TOOLTIP_PROPS: {
  contentStyle: CSSProperties
  labelStyle: CSSProperties
} = {
  contentStyle: {
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--muted-foreground)" },
}

export const CHART_COLORS = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
  goal: "var(--chart-4)",
  raw: "rgba(255,255,255,0.45)",
  rawDot: "rgba(255,255,255,0.6)",
  rawActiveDot: "var(--foreground)",
} as const
