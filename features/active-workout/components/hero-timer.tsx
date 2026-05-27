"use client";

import { Timer } from "lucide-react";

import { useDictionary } from "@/hooks/use-dictionary";
import { formatClock } from "@/lib/format";
import type { ClockValues } from "@/lib/session-utils";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/types";

export function HeroTimer({
  clock,
  status,
}: {
  clock: ClockValues;
  status: SessionStatus;
}) {
  const t = useDictionary();
  const showSetTimer = status === "executing" && clock.setMs > 0;
  return (
    <div className="rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
            <Timer className="size-3.5" />
            {t.activeWorkout.totalTimer}
          </p>
          <p
            className={cn(
              "font-heading text-4xl font-bold tabular-nums sm:text-5xl",
              status === "paused" && "text-muted-foreground",
            )}
          >
            {formatClock(clock.totalMs)}
          </p>
        </div>
        {showSetTimer ? (
          <div className="text-right">
            <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
              {t.activeWorkout.setTimer}
            </p>
            <p className="font-heading text-xl font-semibold tabular-nums text-primary">
              {formatClock(clock.setMs)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
