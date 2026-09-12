"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDictionary } from "@/hooks/use-dictionary";
import { buildWorkoutStreak } from "@/lib/stats-utils";
import {
  completedWorkoutIdsForWeek,
  currentLocalISODate,
  selectTodayWorkout,
  usePlanStore,
  useSessionHistoryStore,
} from "@/store";

export function DashboardHeader() {
  const t = useDictionary();
  const user = useCurrentUser();
  const plan = usePlanStore((s) => s.plan);
  const sessions = useSessionHistoryStore((s) => s.sessions);

  const now = useMemo(() => new Date(), []);
  const streak = useMemo(() => buildWorkoutStreak(sessions, now), [sessions, now]);
  const todayWorkout = useMemo(() => {
    const completedIds = completedWorkoutIdsForWeek(sessions, now);
    return selectTodayWorkout(plan, completedIds, currentLocalISODate(now));
  }, [plan, sessions, now]);

  const [planPrefix, planSuffix] = t.dashboard.todayPlanLine.split("{name}");

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {user.ready ? (
          <h1 className="font-heading text-[1.375rem] leading-tight font-semibold tracking-tight text-foreground sm:text-2xl">
            {t.dashboard.greeting}, {user.name}! <span aria-hidden>💪</span>
          </h1>
        ) : (
          <Skeleton className="h-8 w-48" />
        )}
        <p className="mt-1.5 text-sm text-muted-foreground">
          {streak > 0 ? (
            <>
              {t.dashboard.streakLine.replace("{n}", String(streak))}
              {todayWorkout ? (
                <>
                  {" "}
                  {planPrefix}
                  <span className="font-medium text-foreground">
                    {todayWorkout.name}
                  </span>
                  {planSuffix}
                </>
              ) : null}
            </>
          ) : (
            t.dashboard.greetingSub
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button asChild size="lg" className="hidden sm:inline-flex">
          <Link href="/plan/new">
            <Plus className="size-4" />
            {t.dashboard.newWorkout}
          </Link>
        </Button>
      </div>
    </header>
  );
}
