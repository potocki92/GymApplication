"use client";

import { ToggleChip } from "@/components/ui/toggle-chip";
import { useDictionary } from "@/hooks/use-dictionary";
import type { BodyMetricKey } from "@/types";

export const METRIC_KEYS: BodyMetricKey[] = [
  "weightKg",
  "chestCm",
  "waistCm",
  "hipsCm",
  "bodyFatPct",
];

export function MetricSelector({
  value,
  onChange,
  available,
}: {
  value: BodyMetricKey;
  onChange: (next: BodyMetricKey) => void;
  /** Optional whitelist — only these metrics show as choices. */
  available?: BodyMetricKey[];
}) {
  const t = useDictionary();
  const options = available ?? METRIC_KEYS;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((key) => (
        <ToggleChip
          key={key}
          size="sm"
          selected={value === key}
          onClick={() => onChange(key)}
        >
          {t.metrics.metricSelector[key]}
        </ToggleChip>
      ))}
    </div>
  );
}
