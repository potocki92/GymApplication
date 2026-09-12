import type { CSSProperties } from "react"

/**
 * Shared recharts styling for the premium-dark canvas. Keeping grid, axis and
 * tooltip config in one place stops each chart re-deriving slightly different
 * values, and keeps every chart on the design tokens.
 *
 * Colour rule: one green series carries the data. Reach for `neutral` when a
 * chart genuinely compares two things, and for `warning`/`destructive` only when
 * the colour means something. Do not add series colours "to tell them apart".
 */

export const CHART_GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: "var(--border)",
}

export const CHART_AXIS_PROPS = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  stroke: "var(--border)",
  tickLine: false,
}

/** Graphite mini-card matching the surface/border of the design system. */
export const CHART_TOOLTIP_PROPS: {
  contentStyle: CSSProperties
  labelStyle: CSSProperties
  itemStyle: CSSProperties
  cursor: { stroke: string; strokeWidth: number }
} = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--popover)",
    color: "var(--popover-foreground)",
    fontSize: 12,
    boxShadow: "none",
    padding: "8px 10px",
  },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 2 },
  itemStyle: { color: "var(--popover-foreground)" },
  cursor: { stroke: "var(--border)", strokeWidth: 1 },
}

export const CHART_COLORS = {
  /** The default — activity, volume, anything that is "the data". */
  primary: "var(--data)",
  /** Second series in a genuine comparison. Neutral on purpose. */
  neutral: "var(--chart-2)",
  /** Dimmer green for a supporting series in the same family. */
  secondary: "var(--data-muted)",
  /** Goal/target lines — neutral so the achieved value stays the green one. */
  goal: "var(--foreground)",
  raw: "oklch(from var(--foreground) l c h / 0.4)",
  rawDot: "oklch(from var(--foreground) l c h / 0.55)",
  rawActiveDot: "var(--foreground)",
} as const
