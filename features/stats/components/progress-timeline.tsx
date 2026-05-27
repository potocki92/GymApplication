"use client";

import { Dumbbell, Scale, Target, Trophy } from "lucide-react";
import type { ComponentType } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatWeekdayDatePL } from "@/lib/format";
import type { TimelineEvent } from "@/lib/stats-utils";
import { cn } from "@/lib/utils";

const ICON_BY_TYPE: Record<TimelineEvent["type"], ComponentType<{ className?: string }>> = {
  first_workout: Dumbbell,
  first_weight: Scale,
  weight_milestone: Target,
  pr_milestone: Trophy,
  goal_set: Target,
};

const ACCENT_BY_TYPE: Record<TimelineEvent["type"], string> = {
  first_workout: "bg-primary/15 text-primary",
  first_weight: "bg-info/15 text-info",
  weight_milestone: "bg-success/15 text-success",
  pr_milestone: "bg-warning/15 text-warning",
  goal_set: "bg-accent/15 text-accent",
};

export function ProgressTimeline({
  events,
}: {
  events: TimelineEvent[];
}) {
  const t = useDictionary();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.stats.timeline.title}
        </CardTitle>
        <CardDescription>{t.stats.timeline.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
            <p className="text-sm font-medium">{t.stats.timeline.empty}</p>
            <p className="text-xs text-muted-foreground">
              {t.stats.timeline.emptyHint}
            </p>
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-border/60 pl-5">
            {events.map((event) => {
              const Icon = ICON_BY_TYPE[event.type];
              const iso = new Date(event.at).toISOString().slice(0, 10);
              return (
                <li key={event.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[2.05rem] flex size-7 items-center justify-center rounded-full ring-2 ring-background",
                      ACCENT_BY_TYPE[event.type],
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                      {formatWeekdayDatePL(iso)}
                    </p>
                    <p className="font-heading text-sm font-semibold leading-tight">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
