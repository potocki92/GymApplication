"use client";

import { AlertTriangle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";
import { useHeartRateStore } from "@/store";

/**
 * Sticky banner shown inside the active-workout view when the store has
 * raised a `HighHeartRateAlert`. The alert lifecycle (debounce, severity,
 * persistence) lives in the store — this component is just a presentation
 * layer with an acknowledge action.
 *
 * Until `use-high-hr-alert.ts` lands (Etap 6, with toast + haptics), the
 * store is the single source of truth and the banner is the only surface.
 */
export function HighHrAlertBanner() {
  const t = useDictionary();
  const alert = useHeartRateStore((s) => s.lastAlert);
  const acknowledge = useHeartRateStore((s) => s.acknowledgeAlert);

  if (!alert) return null;

  const isDanger = alert.severity === "danger";

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-3 rounded-xl p-3 ring-1",
        isDanger
          ? "bg-destructive/12 text-destructive ring-destructive/30"
          : "bg-warning/12 text-warning ring-warning/30",
      )}
    >
      <AlertTriangle
        className="size-5 shrink-0"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-semibold">
          {t.activeWorkout.heartRate.alert.title}
        </p>
        <p className="text-xs opacity-90">
          {t.activeWorkout.heartRate.alert.description
            .replace("{bpm}", String(alert.bpm))
            .replace("{threshold}", String(alert.thresholdBpm))}
        </p>
      </div>
      <Button size="xs" variant="ghost" onClick={acknowledge} className="shrink-0">
        <X className="size-3" />
        {t.activeWorkout.heartRate.alert.ack}
      </Button>
    </div>
  );
}
