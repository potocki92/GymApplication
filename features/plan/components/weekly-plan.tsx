"use client";

import { useMemo } from "react";

import {
  completedWorkoutIdsForWeek,
  usePlanStore,
  useSessionHistoryStore,
} from "@/store";
import { Card } from "@/components/ui/card";
import { DayTrainingRow } from "./day-training-row";

export function WeeklyPlan() {
  const plan = usePlanStore((s) => s.plan);
  const sessions = useSessionHistoryStore((s) => s.sessions);
  const now = useMemo(() => new Date(), []);
  const completedWorkoutIds = useMemo(
    () => completedWorkoutIdsForWeek(sessions, now),
    [sessions, now],
  );

  return (
    <Card className="gap-0 divide-y divide-border py-0">
      {plan.days.map((day) => (
        <DayTrainingRow
          key={day.weekday}
          day={day}
          completed={
            !!day.workout && completedWorkoutIds.has(day.workout.id)
          }
        />
      ))}
    </Card>
  );
}
