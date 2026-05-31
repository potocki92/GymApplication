"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Coffee, Dumbbell, Pencil, Play, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { WORKOUT_TYPE_BADGE_CLASSES } from "@/lib/calendar-utils";
import { WEEKDAY_ORDER } from "@/lib/constants";
import {
  formatDurationLong,
  formatVolume,
  formatWeekdayDatePL,
} from "@/lib/format";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import { cn } from "@/lib/utils";
import { useActiveSessionStore } from "@/store";
import type {
  BodyMetricRecord,
  ProgressPhotoRecord,
  SessionHistoryRecord,
  Weekday,
  Workout,
} from "@/types";

function weekdayFromISO(iso: string): Weekday {
  const index = (new Date(`${iso}T00:00:00`).getDay() + 6) % 7;
  return WEEKDAY_ORDER[index];
}

export function DayDetailPanel({
  iso,
  plannedWorkout,
  completedSessions = [],
  metric,
  photo,
  showOverlay = false,
}: {
  iso: string;
  plannedWorkout?: Workout;
  completedSessions?: SessionHistoryRecord[];
  metric?: BodyMetricRecord;
  photo?: ProgressPhotoRecord;
  showOverlay?: boolean;
}) {
  const t = useDictionary();
  const router = useRouter();
  const startSession = useActiveSessionStore((s) => s.startWorkoutSession);
  const editHref = `/plan/new?day=${weekdayFromISO(iso)}`;
  const { url: photoUrl } = useSignedUrl(showOverlay && photo ? photo.thumbPath : null);

  const handleStart = async () => {
    if (!plannedWorkout) return;
    try {
      const session = await startSession(plannedWorkout);
      if (session) router.push("/workout/active");
    } catch (error) {
      console.error(error);
      toast.error(t.errors.unexpectedTitle);
    }
  };

  const isEmpty = !plannedWorkout && completedSessions.length === 0 && !metric && !photo;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-heading text-sm font-semibold capitalize">
            {formatWeekdayDatePL(iso)}
          </h3>
        </div>

        {plannedWorkout ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t.calendar.detail.planned}
              </p>
              {plannedWorkout.type ? (
                <Badge
                  className={cn(
                    "border-transparent",
                    WORKOUT_TYPE_BADGE_CLASSES[plannedWorkout.type],
                  )}
                >
                  {plannedWorkout.type}
                </Badge>
              ) : null}
            </div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Dumbbell className="size-4 text-primary" />
              {plannedWorkout.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.plan.exercises}: {plannedWorkout.exercises.length} ·{" "}
              {formatDurationLong(plannedWorkout.estimatedDurationMin)}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {!plannedWorkout.completed ? (
                <Button size="sm" onClick={() => void handleStart()}>
                  <Play className="size-4" />
                  {t.calendar.detail.start}
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <Link href={editHref}>
                  <Pencil className="size-4" />
                  {t.calendar.detail.edit}
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        {completedSessions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t.calendar.detail.completed}
            </p>
            <ul className="space-y-2">
              {completedSessions.map((session) => (
                <li
                  key={session.id}
                  className="rounded-lg bg-muted/40 p-2.5 text-sm"
                >
                  <p className="font-medium">{session.workoutName}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                    <span>
                      {t.calendar.detail.volume}: {formatVolume(session.totalVolumeKg)}
                    </span>
                    <span>
                      {t.calendar.detail.duration}:{" "}
                      {formatDurationLong(Math.round(session.totalActiveMs / 60000))}
                    </span>
                    {session.rating ? (
                      <span className="flex items-center gap-0.5">
                        <Star className="size-3 fill-warning text-warning" />
                        {session.rating}
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showOverlay && (metric || photo) ? (
          <div className="flex items-center gap-3">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={t.calendar.overlay.photo}
                className="size-16 rounded-lg object-cover"
              />
            ) : photo ? (
              <span className="flex size-16 items-center justify-center rounded-lg bg-muted">
                <Camera className="size-5 text-muted-foreground" />
              </span>
            ) : null}
            {metric ? (
              <div>
                <p className="text-xs text-muted-foreground">
                  {t.calendar.overlay.weight}
                </p>
                <p className="font-heading text-lg font-bold tabular-nums">
                  {metric.weightKg} kg
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {isEmpty ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coffee className="size-4" />
            {t.calendar.detail.noWorkout}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
