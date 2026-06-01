"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";

import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { weekdayFromISO } from "@/lib/calendar-utils";
import { formatDayMonthPL, formatMinutes } from "@/lib/format";
import { pluralPl } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { UpcomingWorkout } from "@/store";

export function UpcomingCard({ items }: { items: UpcomingWorkout[] }) {
  const t = useDictionary();

  return (
    <section className="space-y-3">
      <SectionHeader
        title={t.dashboard.upcomingTitle}
        description={t.dashboard.upcomingSub}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/calendar">
              <CalendarDays className="size-4" />
              {t.dashboard.openCalendar}
            </Link>
          </Button>
        }
      />

      {items.length > 0 ? (
        <Card className="gap-0 divide-y divide-border py-0">
          {items.map((item) => {
            const { day, month } = formatDayMonthPL(item.date);
            const weekday = weekdayFromISO(item.date);
            const count = item.workout.exercises.length;
            return (
              <Link
                key={item.date}
                href={`/plan/new?day=${weekday}`}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40",
                  item.isToday && "bg-primary/5",
                )}
              >
                <div
                  className={cn(
                    "flex w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border py-1.5",
                    item.isToday && "border-primary",
                  )}
                >
                  <span
                    className={cn(
                      "font-heading text-lg font-bold leading-none tabular-nums",
                      item.isToday && "text-primary",
                    )}
                  >
                    {day}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {month}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.workout.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {count} {pluralPl(count, t.workoutForm.exerciseForms)} · ~
                    {formatMinutes(item.workout.estimatedDurationMin)}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </Card>
      ) : (
        <Card className="py-6">
          <p className="px-4 text-center text-sm text-muted-foreground">
            {t.dashboard.noUpcoming}
          </p>
        </Card>
      )}
    </section>
  );
}
