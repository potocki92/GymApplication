import Link from "next/link";
import { CircleCheckBig, Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatShortWeekdayDatePL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { weekdayToISO } from "@/store";
import type { WorkoutDay } from "@/types";

export function UpcomingWorkoutsCard({
  days,
  weekStart,
}: {
  days: WorkoutDay[];
  weekStart: string;
}) {
  const t = useDictionary();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.dashboard.upcoming}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-1">
        {days.map((day) => {
          const iso = weekdayToISO(weekStart, day.weekday);
          const done = day.workout?.completed;
          return (
            <div
              key={day.weekday}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
            >
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{formatShortWeekdayDatePL(iso)}</p>
                <p
                  className={cn(
                    "truncate text-sm font-medium",
                    day.rest && "text-muted-foreground",
                  )}
                >
                  {day.rest ? t.common.rest : (day.workout?.name ?? t.dashboard.noNextWorkout)}
                </p>
              </div>
              {day.rest ? (
                <Coffee className="size-4 shrink-0 text-muted-foreground" />
              ) : done ? (
                <CircleCheckBig className="size-4 shrink-0 text-success" />
              ) : (
                <span className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
              )}
            </div>
          );
        })}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="h-10 w-full">
          <Link href="/plan">{t.dashboard.seeFullPlan}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
