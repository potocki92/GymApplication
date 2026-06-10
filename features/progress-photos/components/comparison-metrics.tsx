"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { useDictionary } from "@/hooks/use-dictionary";
import { metricDeltas, nearestMetricOnOrBefore } from "@/lib/metrics-utils";
import { useMetricsStore } from "@/store";
import type { BodyMetricKey, ProgressPhotoRecord } from "@/types";

interface ComparisonMetricsProps {
  before: ProgressPhotoRecord;
  after: ProgressPhotoRecord;
}

const METRIC_TOLERANCE_DAYS = 7;

const METRIC_UNITS: Record<BodyMetricKey, string> = {
  weightKg: "kg",
  chestCm: "cm",
  waistCm: "cm",
  hipsCm: "cm",
  bodyFatPct: "%",
};

function formatDelta(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
  return `${sign}${Math.abs(rounded).toLocaleString("pl-PL")} ${unit}`;
}

/**
 * Body-measurement deltas between the dates of the two compared photos,
 * sourced from the metrics log (nearest entry up to a week back per photo).
 * Photo-level weight takes precedence over the log when both exist.
 */
export function ComparisonMetrics({ before, after }: ComparisonMetricsProps) {
  const t = useDictionary();
  const metricRecords = useMetricsStore((s) => s.records);

  const deltas = useMemo(() => {
    const beforeMetric = nearestMetricOnOrBefore(
      metricRecords,
      before.takenAt,
      METRIC_TOLERANCE_DAYS,
    );
    const afterMetric = nearestMetricOnOrBefore(
      metricRecords,
      after.takenAt,
      METRIC_TOLERANCE_DAYS,
    );
    const out = metricDeltas(beforeMetric, afterMetric);
    // Weight recorded directly on the photos is the more precise pairing.
    if (before.weightKg != null && after.weightKg != null) {
      out.weightKg = after.weightKg - before.weightKg;
    }
    return out;
  }, [metricRecords, before, after]);

  const labels: Record<BodyMetricKey, string> = {
    weightKg: t.progressPhotos.metricsDelta.weight,
    chestCm: t.progressPhotos.metricsDelta.chest,
    waistCm: t.progressPhotos.metricsDelta.waist,
    hipsCm: t.progressPhotos.metricsDelta.hips,
    bodyFatPct: t.progressPhotos.metricsDelta.bodyFat,
  };

  const entries = (Object.keys(deltas) as BodyMetricKey[]).map((key) => ({
    key,
    label: labels[key],
    value: formatDelta(deltas[key]!, METRIC_UNITS[key]),
  }));

  if (entries.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        {t.progressPhotos.metricsDelta.title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {entries.map((e) => (
          <Badge key={e.key} variant="outline" className="gap-1 text-[11px]">
            <span className="text-muted-foreground">{e.label}</span>
            <span className="font-semibold tabular-nums">{e.value}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
