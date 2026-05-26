"use client";

import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";
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
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "rounded-full border border-border bg-card px-3 py-1 text-xs font-medium transition-colors",
            value === key
              ? "border-primary/40 bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={value === key}
        >
          {t.metrics.metricSelector[key]}
        </button>
      ))}
    </div>
  );
}
