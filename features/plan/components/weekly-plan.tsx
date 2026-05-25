"use client";

import { usePlanStore } from "@/store";
import { cn } from "@/lib/utils";
import { DayTrainingCard } from "./day-training-card";

export function WeeklyPlan({ gridClassName }: { gridClassName?: string }) {
  const plan = usePlanStore((s) => s.plan);

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7",
        gridClassName,
      )}
    >
      {plan.days.map((day) => (
        <DayTrainingCard key={day.weekday} day={day} />
      ))}
    </div>
  );
}
