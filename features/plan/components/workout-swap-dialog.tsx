"use client";

import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatMinutes } from "@/lib/format";
import { pluralPl } from "@/lib/i18n";
import { usePlanStore } from "@/store";
import type { Weekday } from "@/types";

/** Swaps today's workout with another training day in the template week. */
export function WorkoutSwapDialog({
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.dashboard.swapDialog.title}</DialogTitle>
          <DialogDescription>{t.dashboard.swapDialog.desc}</DialogDescription>
        </DialogHeader>

        {options.length > 0 ? (
          <ul className="space-y-2">
            {options.map((d) => {
              const workout = d.workout!;
              const count = workout.exercises.length;
              return (
                <li key={d.weekday}>
                  <button
                    type="button"
                    onClick={() => handleSwap(d.weekday)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-muted-foreground">
                        {t.weekdays.full[d.weekday]}
                      </span>
                      <span className="block truncate text-sm font-medium">
                        {workout.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {count} {pluralPl(count, t.workoutForm.exerciseForms)} · ~
                      {formatMinutes(workout.estimatedDurationMin)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.dashboard.swapDialog.empty}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
