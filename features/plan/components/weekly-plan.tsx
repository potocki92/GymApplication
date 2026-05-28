"use client";

import { useMemo } from "react";

import {
  completedWorkoutIdsForWeek,
  usePlanStore,
  useSessionHistoryStore,
} from "@/store";
import { cn } from "@/lib/utils";
import { DayTrainingCard } from "./day-training-card";

export function WeeklyPlan({ gridClassName }: { gridClassName?: string }) {
  const plan = usePlanStore((s) => s.plan);
  const sessions = useSessionHistoryStore((s) => s.sessions);
  const now = useMemo(() => new Date(), []);
  const completedWorkoutIds = useMemo(
    () => completedWorkoutIdsForWeek(sessions, now),
    [sessions, now],
  );

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7",
        gridClassName,
      )}
    >
      {plan.days.map((day) => (
        <DayTrainingCard
          key={day.weekday}
          day={day}
          completed={
            !!day.workout &&
            (day.workout.completed || completedWorkoutIds.has(day.workout.id))
          }
        />
      ))}
    </div>
  );
}
