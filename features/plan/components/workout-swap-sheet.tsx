"use client";

import { toast } from "sonner";

import { ListRow } from "@/components/shared/list-row";
import { AppSheet, AppSheetBody } from "@/components/ui/app-sheet";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatMinutes } from "@/lib/format";
import { pluralPl } from "@/lib/i18n";
import { usePlanStore } from "@/store";
import type { Weekday } from "@/types";

/** Swaps today's workout with another training day in the template week. */
export function WorkoutSwapSheet({
  open,
  onOpenChange,
  todayWeekday,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayWeekday: Weekday;
}) {
  const t = useDictionary();
  const plan = usePlanStore((s) => s.plan);
  const swap = usePlanStore((s) => s.swapWorkoutDays);

  const options = plan.days.filter(
    (d) => d.weekday !== todayWeekday && !d.rest && d.workout,
  );

  const handleSwap = (weekday: Weekday) => {
    if (swap(todayWeekday, weekday)) {
      toast.success(t.dashboard.swapDialog.swapped);
    }
    onOpenChange(false);
  };

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.dashboard.swapDialog.title}
      description={t.dashboard.swapDialog.desc}
    >
      <AppSheetBody>
        {options.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {options.map((d) => {
              const workout = d.workout;
              if (!workout) return null;
              const count = workout.exercises.length;

              return (
                <li key={d.weekday}>
                  <ListRow
                    onClick={() => handleSwap(d.weekday)}
                    title={workout.name}
                    description={t.weekdays.full[d.weekday]}
                    trailing={
                      <span className="text-xs text-muted-foreground">
                        {count} {pluralPl(count, t.workoutForm.exerciseForms)} · ~
                        {formatMinutes(workout.estimatedDurationMin)}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.dashboard.swapDialog.empty}
          </p>
        )}
      </AppSheetBody>
    </AppSheet>
  );
}
