"use client";

import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDictionary } from "@/hooks/use-dictionary";
import type { MeasurementDelta } from "@/lib/stats-utils";
import { cn } from "@/lib/utils";
import type { BodyMetricKey } from "@/types";

const UNIT_BY_METRIC: Record<BodyMetricKey, string> = {
  weightKg: "kg",
  chestCm: "cm",
  waistCm: "cm",
  hipsCm: "cm",
  bodyFatPct: "%",
};

export function MeasurementsCard({
  deltas,
}: {
  deltas: MeasurementDelta[];
}) {
  const t = useDictionary();
  const withData = deltas.filter((d) => d.startValue != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.stats.measurements.title}
        </CardTitle>
        <CardDescription>{t.stats.measurements.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {withData.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
            <p className="text-sm font-medium">{t.stats.measurements.empty}</p>
            <p className="text-xs text-muted-foreground">
              {t.stats.measurements.emptyHint}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {withData.map((d) => (
              <MeasurementRow key={d.metric} delta={d} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MeasurementRow({ delta }: { delta: MeasurementDelta }) {
  const t = useDictionary();
  const { metric, startValue, currentValue, deltaAbs, deltaPct } = delta;
  const unit = UNIT_BY_METRIC[metric];
  const label = t.stats.measurements.labels[metric];

  const isDown = deltaAbs != null && deltaAbs < 0;
  const isUp = deltaAbs != null && deltaAbs > 0;
  const isFlat = deltaAbs == null || deltaAbs === 0;

  // For waist / body fat, going DOWN is a positive signal. For chest, going UP is.
  // Weight + hips are neutral here — we color by direction but don't ascribe success.
  const goodDown: BodyMetricKey[] = ["waistCm", "bodyFatPct"];
  const goodUp: BodyMetricKey[] = ["chestCm"];
  const accent =
    isFlat
      ? "muted"
      : (goodDown.includes(metric) && isDown) || (goodUp.includes(metric) && isUp)
        ? "success"
        : (goodDown.includes(metric) && isUp) || (goodUp.includes(metric) && isDown)
          ? "warning"
          : "primary";

  const accentText = {
    muted: "text-muted-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
  }[accent];

  const accentBar = {
    muted: "[&>[data-slot=progress-indicator]]:bg-muted-foreground/30",
    primary: "[&>[data-slot=progress-indicator]]:bg-primary",
    success: "[&>[data-slot=progress-indicator]]:bg-success",
    warning: "[&>[data-slot=progress-indicator]]:bg-warning",
  }[accent];

  // Bar fill: % of |delta| against |delta| or 10 of the metric, capped at 100.
  const barValue = Math.min(100, Math.abs(deltaPct ?? 0) * 2);

  const Icon = isDown ? ArrowDown : isUp ? ArrowUp : ArrowRight;

  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-3 tabular-nums">
          <span className="text-muted-foreground">
            {startValue?.toFixed(1)} → {currentValue?.toFixed(1)} {unit}
          </span>
          <span className={cn("inline-flex items-center gap-1 font-heading font-semibold", accentText)}>
            <Icon className="size-3.5" />
            {isFlat
              ? t.stats.measurements.noChange
              : `${isUp ? "+" : "−"}${Math.abs(deltaAbs ?? 0).toFixed(1)} ${unit}`}
          </span>
        </div>
      </div>
      <Progress value={barValue} className={cn("h-1.5", accentBar)} />
    </li>
  );
}
