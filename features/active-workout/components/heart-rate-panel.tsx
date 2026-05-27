"use client";

import Link from "next/link";
import { HeartPulse, Watch, Wifi, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";
import type {
  HeartRateSnapshot,
  HeartRateZoneDefinition,
  HRConnectionState,
  HRDevice,
} from "@/types";

/**
 * HR strip shown above the timers. Three visual states:
 *  - live data: large current bpm + avg/max + zone tint
 *  - data captured but no live stream: avg/max stats
 *  - no data: placeholder with Garmin connect CTA (Etap 5)
 *
 * `compact` keeps the original one-row strip. Drop it to `false` and pass
 * `zones` to render the expanded card (used inside the live-training view).
 */
export function HeartRatePanel({
  heartRate,
  compact = true,
  zones,
  connectionState,
  device,
}: {
  heartRate?: HeartRateSnapshot;
  compact?: boolean;
  zones?: HeartRateZoneDefinition[] | null;
  connectionState?: HRConnectionState;
  device?: HRDevice | null;
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

  const zoneClass = zoneTint(heartRate.currentZone, zones);

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

  return (
    <div
      className={cn(
        "rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        zoneClass,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HeartPulse className="size-3.5" />
            <span>{t.activeWorkout.heartRate.title}</span>
            <ConnectionBadge state={connectionState} />
          </div>
          <div className="font-heading text-4xl font-bold tabular-nums leading-none">
            {heartRate.currentBpm ?? "—"}
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              bpm
            </span>
          </div>
          {heartRate.currentZone != null ? (
            <div className="text-xs">
              {t.activeWorkout.heartRate.zone}: Z{heartRate.currentZone}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs tabular-nums text-right">
          {heartRate.avgBpm != null ? (
            <>
              <span className="text-muted-foreground">
                {t.activeWorkout.heartRate.avg}
              </span>
              <span>{heartRate.avgBpm}</span>
            </>
          ) : null}
          {heartRate.maxBpm != null ? (
            <>
              <span className="text-muted-foreground">
                {t.activeWorkout.heartRate.max}
              </span>
              <span>{heartRate.maxBpm}</span>
            </>
          ) : null}
          {device ? (
            <>
              <span className="text-muted-foreground">
                {t.activeWorkout.heartRate.device}
              </span>
              <span className="truncate">{device.model ?? device.vendor}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ConnectionBadge({ state }: { state?: HRConnectionState }) {
  const t = useDictionary();
  if (!state || state === "idle") return null;
  if (state === "open") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
        <Wifi className="size-3" />
        live
      </span>
    );
  }
  if (state === "reconnecting" || state === "connecting") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
        <Wifi className="size-3 animate-pulse" />
        {t.activeWorkout.heartRate.reconnecting}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-rose-300">
      <WifiOff className="size-3" />
      {t.activeWorkout.heartRate.signalLost}
    </span>
  );
}

function zoneTint(
  zone: number | undefined,
  zones?: HeartRateZoneDefinition[] | null,
): string | undefined {
  if (zone == null) return undefined;
  // Prefer the zone's authoritative color tokens when bounds are known.
  const match = zones?.find((z) => z.zone === zone);
  if (match) return `${match.color.ring} ${match.color.bg} ${match.color.fg}`;
  // Fallback palette preserved for backward compat when bounds are unavailable.
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
