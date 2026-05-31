"use client";

import { Camera, CircleCheckBig } from "lucide-react";

import { workoutTypeDotClass } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import type { BodyMetricRecord, SessionHistoryRecord, Workout } from "@/types";

export interface CalendarDayCellProps {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  selected: boolean;
  plannedWorkout?: Workout;
  completedSessions?: SessionHistoryRecord[];
  /** Timeline overlay data (rendered only when `showOverlay` is true). */
  metric?: BodyMetricRecord;
  hasPhoto?: boolean;
  showOverlay?: boolean;
  onSelect: (iso: string) => void;
}

export function CalendarDayCell({
  iso,
  day,
  inCurrentMonth,
  isToday,
  selected,
  plannedWorkout,
  completedSessions,
  metric,
  hasPhoto,
  showOverlay = false,
  onSelect,
}: CalendarDayCellProps) {
  const completedCount = completedSessions?.length ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(iso)}
      aria-pressed={selected}
      className={cn(
        "flex min-h-16 flex-col gap-1 rounded-lg border border-border/60 p-1.5 text-left transition-colors sm:min-h-20 sm:p-2",
        "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        inCurrentMonth ? "bg-card" : "bg-muted/20 text-muted-foreground",
        selected && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-medium tabular-nums sm:text-sm",
            isToday &&
              "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-6",
          )}
        >
          {day}
        </span>
        {completedCount > 0 ? (
          <span className="flex items-center gap-0.5 text-success">
            <CircleCheckBig className="size-3.5" />
            {completedCount > 1 ? (
              <span className="text-[0.65rem] font-semibold tabular-nums">
                {completedCount}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {plannedWorkout ? (
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              workoutTypeDotClass(plannedWorkout.type),
            )}
          />
          <span className="truncate text-[0.65rem] leading-tight sm:text-xs">
            {plannedWorkout.name}
          </span>
        </div>
      ) : null}

      {showOverlay ? (
        <div className="mt-auto flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
          {metric ? (
            <span className="tabular-nums">{metric.weightKg} kg</span>
          ) : null}
          {hasPhoto ? <Camera className="size-3" /> : null}
        </div>
      ) : null}
    </button>
  );
}
