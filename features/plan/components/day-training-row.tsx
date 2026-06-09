"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BookmarkPlus, CircleCheckBig, Coffee, Play, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useActiveSessionStore, usePlanStore, useTemplatesStore } from "@/store";
import type { WorkoutDay } from "@/types";

export function DayTrainingRow({
  day,
  completed = day.workout?.completed ?? false,
}: {
  day: WorkoutDay;
  completed?: boolean;
}) {
  const t = useDictionary();
  const router = useRouter();
  const startSession = useActiveSessionStore((s) => s.startWorkoutSession);
  const removeWorkout = usePlanStore((s) => s.removeWorkout);
  const saveAsTemplate = useTemplatesStore((s) => s.saveFromWorkout);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { weekday, rest, workout } = day;
  const href = `/plan/new?day=${weekday}`;

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

  const handleDelete = () => {
    if (!workout) return;
    setConfirmDelete(false);
    removeWorkout(weekday);
    toast.success(t.plan.deleted);
  };

  const handleSaveTemplate = () => {
    if (!workout) return;
    void saveAsTemplate(workout);
    toast.success(t.templates.saved);
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between",
          rest && "bg-muted/20",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {workout ? (
            completed ? (
              <CircleCheckBig className="size-5 shrink-0 text-success" />
            ) : (
              <span className="size-5 shrink-0 rounded-full border-2 border-muted-foreground/30" />
            )
          ) : (
            <span className="size-5 shrink-0" aria-hidden />
          )}
          <span className="w-28 shrink-0 font-heading text-sm font-semibold">
            {t.weekdays.full[weekday]}
          </span>
          <div className="min-w-0">
            {rest ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coffee className="size-4 shrink-0" />
                {t.plan.restDay}
              </p>
            ) : workout ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{workout.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.plan.exercises}: {workout.exercises.length} ·{" "}
                  {formatMinutes(workout.estimatedDurationMin)}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {workout ? (
          <div className="flex items-center gap-2 sm:shrink-0 sm:pl-2">
            {!completed ? (
              <Button size="sm" onClick={() => void handleStart()}>
                <Play className="size-4" />
                {t.activeWorkout.start}
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link href={href}>{t.plan.editWorkout}</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-primary"
              aria-label={t.templates.saveAsTemplate}
              title={t.templates.saveAsTemplate}
              onClick={handleSaveTemplate}
            >
              <BookmarkPlus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              aria-label={t.plan.deleteWorkout}
              title={t.plan.deleteWorkout}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center sm:shrink-0 sm:pl-2">
            <Button asChild variant="outline" size="sm">
              <Link href={href}>
                <Plus className="size-4" />
                {t.plan.planWorkout}
              </Link>
            </Button>
          </div>
        )}
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.plan.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{t.plan.deleteConfirmDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t.plan.deleteWorkout}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
