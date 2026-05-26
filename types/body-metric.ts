/** The metrics we can chart. New metrics added here propagate to selectors. */
export type BodyMetricKey =
  | "weightKg"
  | "chestCm"
  | "waistCm"
  | "hipsCm"
  | "bodyFatPct";

/**
 * A single body-metric measurement. `weightKg` is required (the most-used metric);
 * other fields are optional so users can fill out only what they tracked that day.
 */
export interface BodyMetricRecord {
  id: string;
  /** ISO date `YYYY-MM-DD` — measurements are bucketed by day. */
  date: string;
  weightKg: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  bodyFatPct?: number;
  notes?: string;
  /** Epoch ms — last write time, used to break ties when two records share a date. */
  updatedAt: number;
}

/**
 * The weight-tracking goal: where the user started (anchor for progress %) and
 * where they want to land. Other metrics get goals later.
 */
export interface BodyMetricGoal {
  metric: "weightKg";
  startKg: number;
  targetKg: number;
}

export const METRIC_SCHEMA_VERSION = 1;
