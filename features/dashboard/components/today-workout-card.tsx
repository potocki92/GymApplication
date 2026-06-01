"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Pencil, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getExerciseById } from "@/data";
import { WorkoutSwapDialog } from "@/features/plan/components/workout-swap-dialog";
import { useDictionary } from "@/hooks/use-dictionary";
import { weekdayFromISO } from "@/lib/calendar-utils";
import { formatMinutes, formatVolume } from "@/lib/format";
import { pluralPl } from "@/lib/i18n";
import type { ProgramWeek } from "@/lib/program-utils";
import { getWorkoutVolume } from "@/lib/workout-utils";
import { useActiveSessionStore } from "@/store";
import type { Workout } from "@/types";

export function TodayWorkoutCard({
  workout,
  isToday,
  programWeek,
}: {
  workout?: Workout;
  isToday: boolean;
  programWeek: ProgramWeek | null;
}) {
  const t = useDictionary();
  const router = useRouter();
  const startSession = useActiveSessionStore((s) => s.startWorkoutSession);
  const [swapOpen, setSwapOpen] = useState(false);

  const handleStart = async () => {
    if (!workout) return;
    try {
      const session = await startSession(workout);
      if (session) router.push("/workout/active");
    } catch (error) {
      console.error(error);
      toast.error(t.errors.unexpectedTitle);
    }
  };

  const weekday = workout?.date ? weekdayFromISO(workout.date) : undefined;
  const count = workout?.exercises.length ?? 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {isToday ? t.dashboard.todayWorkout : t.dashboard.nextWorkout}
        </CardTitle>
        {programWeek ? (
          <CardAction>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.dashboard.programWeek} {programWeek.week} / {programWeek.total}
            </span>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {workout ? (
          <>
            <p className="font-heading text-lg font-semibold">{workout.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {count} {pluralPl(count, t.workoutForm.exerciseForms)} · ~
              {formatMinutes(workout.estimatedDurationMin)} ·{" "}
              <span className="text-primary">
                {formatVolume(getWorkoutVolume(workout))} {t.dashboard.volumeOf}
              </span>
            </p>

            <ol className="mt-4 space-y-1.5">
              {workout.exercises.map((ex, i) => {
                const name = getExerciseById(ex.exerciseId)?.name ?? ex.exerciseId;
                return (
                  <li
                    key={ex.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate text-sm font-medium">{name}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {ex.sets} × {ex.reps}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="h-10 flex-1" onClick={() => void handleStart()}>
                <Play className="size-4" />
                {t.dashboard.startWorkout}
              </Button>
              {weekday ? (
                <Button asChild variant="outline" className="h-10">
                  <Link href={`/plan/new?day=${weekday}`}>
                    <Pencil className="size-4" />
                    {t.dashboard.editPlan}
                  </Link>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => setSwapOpen(true)}
              >
                <ArrowRightLeft className="size-4" />
                {t.dashboard.swap}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.dashboard.noNextWorkout}
          </p>
        )}
      </CardContent>

      {weekday ? (
        <WorkoutSwapDialog
          open={swapOpen}
          onOpenChange={setSwapOpen}
          todayWeekday={weekday}
        />
      ) : null}
    </Card>
  );
}
