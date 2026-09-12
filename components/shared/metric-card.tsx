import type { ComponentType } from "react";

import { DeltaPill, type DeltaDirection } from "@/components/shared/delta-pill";
import { Sparkline } from "@/components/shared/sparkline";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  /** Usually a `StatValue`. Kept as a node so units and suffixes stay flexible. */
  value: React.ReactNode;
  /** Small print under the metric, e.g. "Najdłuższa: 21 dni". */
  hint?: React.ReactNode;
  /** Rendered muted on the right of the label row — decoration, never the point. */
  icon?: ComponentType<{ className?: string }>;
  delta?: { direction: DeltaDirection; label: string };
  /** Series for the background sparkline, oldest → newest. */
  sparkline?: number[];
  className?: string;
}

/**
 * The KPI card of the system: uppercase label, one large value, optional hint,
 * optional muted icon. Every quick-glance metric — dashboard, stats, calendar,
 * session summary — uses this instead of hand-rolling a card surface.
 */
export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  sparkline,
  className,
}: MetricCardProps) {
  return (
    <Card size="sm" className={cn("relative gap-2 px-4 py-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <SectionLabel className="min-w-0 truncate pt-0.5">{label}</SectionLabel>
        <span className="flex shrink-0 items-center gap-1.5">
          {delta ? (
            <DeltaPill direction={delta.direction}>{delta.label}</DeltaPill>
          ) : null}
          {Icon ? <Icon className="size-4 text-muted-foreground/70" /> : null}
        </span>
      </div>

      {value}

      {hint ? (
        <div className="text-xs text-muted-foreground tabular-nums">{hint}</div>
      ) : null}

      {sparkline && sparkline.length >= 2 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 opacity-45">
          <Sparkline data={sparkline} color="var(--data)" />
        </div>
      ) : null}
    </Card>
  );
}
