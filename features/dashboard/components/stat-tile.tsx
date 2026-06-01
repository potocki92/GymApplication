import type { ComponentType } from "react";

import { AnimatedCounter } from "@/components/shared/animated-counter";
import { DeltaPill, type DeltaDirection } from "@/components/shared/delta-pill";
import { Sparkline } from "@/components/shared/sparkline";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatTileProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  /** Small print under the metric, e.g. "Najdłuższa: 21 dni". */
  foot?: React.ReactNode;
  delta?: { direction: DeltaDirection; label: string };
  /** Series for the background sparkline, oldest → newest. */
  sparkline?: number[];
  sparklineColor?: string;
  className?: string;
}

/**
 * Compact KPI tile: eyebrow label + trend chip, an animated metric, a foot note
 * and a soft sparkline bleeding off the bottom edge. The quick-glance row of the
 * dashboard — detailed cards live below it.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  decimals = 0,
  foot,
  delta,
  sparkline,
  sparklineColor = "var(--primary)",
  className,
}: StatTileProps) {
  return (
    <Card className={cn("relative gap-2 p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Icon className="size-3.5" />
          {label}
        </span>
        {delta ? <DeltaPill direction={delta.direction}>{delta.label}</DeltaPill> : null}
      </div>

      <p className="font-numeric text-3xl leading-none font-black tracking-tight tabular-nums">
        <AnimatedCounter value={value} decimals={decimals} />
        {unit ? (
          <span className="ml-1 text-base font-bold text-muted-foreground">{unit}</span>
        ) : null}
      </p>

      {foot ? <p className="text-sm text-muted-foreground">{foot}</p> : null}

      {sparkline && sparkline.length >= 2 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 opacity-55">
          <Sparkline data={sparkline} color={sparklineColor} />
        </div>
      ) : null}
    </Card>
  );
}
