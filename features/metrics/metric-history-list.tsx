"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatShortWeekdayDatePL } from "@/lib/format";
import { sortRecords } from "@/lib/metrics-utils";
import { useMetricsStore } from "@/store";
import type { BodyMetricRecord } from "@/types";

function inlineExtras(t: ReturnType<typeof useDictionary>, r: BodyMetricRecord): string {
  const parts: string[] = [];
  if (r.chestCm != null) parts.push(`${t.metrics.columns.chest} ${r.chestCm}${t.metrics.units.cm}`);
  if (r.waistCm != null) parts.push(`${t.metrics.columns.waist} ${r.waistCm}${t.metrics.units.cm}`);
  if (r.hipsCm != null) parts.push(`${t.metrics.columns.hips} ${r.hipsCm}${t.metrics.units.cm}`);
  if (r.bodyFatPct != null)
    parts.push(`${t.metrics.columns.bodyFat} ${r.bodyFatPct}${t.metrics.units.pct}`);
  return parts.join(" · ");
}

export function MetricHistoryList({
  onEdit,
}: {
  onEdit: (record: BodyMetricRecord) => void;
}) {
  const t = useDictionary();
  const records = useMetricsStore((s) => s.records);
  const remove = useMetricsStore((s) => s.remove);

  const sorted = sortRecords(records).reverse();

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-sm font-medium">{t.metrics.historyEmpty}</p>
        <p className="text-xs text-muted-foreground">{t.metrics.noDataHint}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((r) => {
        const extras = inlineExtras(t, r);
        return (
          <li
            key={r.id}
            className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                {formatShortWeekdayDatePL(r.date)}
              </p>
              <p className="font-heading text-base font-semibold tabular-nums">
                {r.weightKg} {t.metrics.units.kg}
              </p>
              {extras ? (
                <p className="line-clamp-1 text-xs text-muted-foreground tabular-nums">
                  {extras}
                </p>
              ) : null}
              {r.notes ? (
                <p className="mt-0.5 line-clamp-1 text-xs italic text-muted-foreground">
                  {r.notes}
                </p>
              ) : null}
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t.common.edit}
              onClick={() => onEdit(r)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t.common.delete}
              onClick={() => {
                if (window.confirm(t.metrics.deleteConfirm)) void remove(r.id);
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
