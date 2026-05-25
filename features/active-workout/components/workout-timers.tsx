"use client";

import { useDictionary } from "@/hooks/use-dictionary";
import { formatClock } from "@/lib/format";
import type { ClockValues } from "@/lib/session-utils";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/types";

function Tile({
  label,
  value,
  active,
  alarm,
}: {
  label: string;
  value: string;
  active?: boolean;
  alarm?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-xl bg-card px-2 py-4 ring-1 ring-foreground/10 transition-colors",
        active && "bg-primary/10 ring-primary/40",
        alarm && "bg-destructive/10 ring-destructive/50",
      )}
    >
      <span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={cn(
          "font-heading text-2xl font-bold tabular-nums sm:text-3xl",
          active && "text-primary",
          alarm && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function WorkoutTimers({
  clock,
  status,
}: {
  clock: ClockValues;
  status: SessionStatus;
}) {
  const t = useDictionary();
  const isResting = status === "resting";
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <Tile label={t.activeWorkout.timers.total} value={formatClock(clock.totalMs)} />
      <Tile
        label={t.activeWorkout.timers.set}
        value={formatClock(clock.setMs)}
        active={status === "executing"}
      />
      <Tile
        label={t.activeWorkout.timers.rest}
        value={formatClock(clock.restRemainingMs)}
        active={isResting && !clock.restDone}
        alarm={isResting && clock.restDone}
      />
    </div>
  );
}
