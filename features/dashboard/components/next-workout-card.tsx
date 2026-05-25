"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatMinutes, formatRest, formatWeekdayDatePL } from "@/lib/format";
import { useActiveSessionStore } from "@/store";
import type { Workout } from "@/types";

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-sm font-semibold">{value}</p>
    </div>
  );
}

export function NextWorkoutCard({ workout }: { workout?: Workout }) {
  const t = useDictionary();
  const router = useRouter();
  const startSession = useActiveSessionStore((s) => s.start);
  const restSec = workout?.exercises[0]?.restSec ?? 90;

  const handleStart = () => {
    if (!workout) return;
    startSession(workout);
    router.push("/workout/active");
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.dashboard.nextWorkout}
        </CardTitle>
        {workout?.date ? (
          <CardAction className="text-xs text-muted-foreground">
            {formatWeekdayDatePL(workout.date)}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {workout ? (
          <>
            <p className="font-heading text-base font-semibold">{workout.name}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Meta label={t.dashboard.workoutMeta.exercises} value={String(workout.exercises.length)} />
              <Meta label={t.dashboard.workoutMeta.estTime} value={formatMinutes(workout.estimatedDurationMin)} />
              <Meta label={t.dashboard.workoutMeta.restBetween} value={formatRest(restSec)} />
            </div>
            <Button className="mt-5 h-10 w-full" onClick={handleStart}>
              {t.dashboard.startWorkout}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t.dashboard.noNextWorkout}</p>
        )}
      </CardContent>
    </Card>
  );
}
