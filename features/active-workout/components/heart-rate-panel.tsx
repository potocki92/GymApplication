"use client";

import Link from "next/link";
import { HeartPulse, Watch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";
import type { HeartRateSnapshot } from "@/types";

/**
 * Compact HR strip shown above the timers. Renders one of three states:
 *  - live data: large current bpm + avg/max + zone tint
 *  - data captured but no live stream: avg/max stats
 *  - no data: placeholder with Garmin connect CTA (Etap 5)
 */
export function HeartRatePanel({
  heartRate,
  compact = true,
}: {
  heartRate?: HeartRateSnapshot;
  compact?: boolean;
}) {
  const t = useDictionary();

  if (!heartRate || (heartRate.currentBpm == null && heartRate.avgBpm == null)) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card/40 p-3">
        <div className="flex items-center gap-2">
          <HeartPulse className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {t.activeWorkout.heartRate.connectGarmin}
          </span>
        </div>
        <Button asChild size="xs" variant="outline">
          <Link href="/settings">
            <Watch className="size-3" />
            Garmin
          </Link>
        </Button>
      </div>
    );
  }

  const zoneClass = zoneTint(heartRate.currentZone);

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10",
          zoneClass,
        )}
      >
        <div className="flex items-center gap-2">
          <HeartPulse className="size-4" />
          <div className="font-heading text-xl font-bold tabular-nums">
            {heartRate.currentBpm ?? "—"}{" "}
            <span className="text-xs font-medium text-muted-foreground">bpm</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs tabular-nums">
          {heartRate.avgBpm != null ? (
            <span>
              <span className="text-muted-foreground">{t.activeWorkout.heartRate.avg}: </span>
              {heartRate.avgBpm}
            </span>
          ) : null}
          {heartRate.maxBpm != null ? (
            <span>
              <span className="text-muted-foreground">{t.activeWorkout.heartRate.max}: </span>
              {heartRate.maxBpm}
            </span>
          ) : null}
          {heartRate.currentZone != null ? (
            <span>
              <span className="text-muted-foreground">{t.activeWorkout.heartRate.zone}: </span>
              Z{heartRate.currentZone}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}

function zoneTint(zone: number | undefined): string | undefined {
  switch (zone) {
    case 1:
      return "ring-blue-500/40 bg-blue-500/10 text-blue-300";
    case 2:
      return "ring-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case 3:
      return "ring-amber-500/40 bg-amber-500/10 text-amber-300";
    case 4:
      return "ring-orange-500/40 bg-orange-500/10 text-orange-300";
    case 5:
      return "ring-rose-500/40 bg-rose-500/10 text-rose-300";
    default:
      return undefined;
  }
}
