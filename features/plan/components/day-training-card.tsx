"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CircleCheckBig, Coffee, Play, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useActiveSessionStore, usePlanStore } from "@/store";
import type { WorkoutDay } from "@/types";

export function DayTrainingCard({
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

  return (
    <>
    <Card
      className={cn(
        "h-full transition-shadow hover:shadow-md",
        rest && "border-dashed bg-muted/30 ring-foreground/5",
      )}
    >
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-heading text-sm font-semibold">
            {t.weekdays.full[weekday]}
          </span>
          {workout ? (
            completed ? (
              <CircleCheckBig className="size-5 shrink-0 text-success" />
            ) : (
              <span className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
            )
          ) : null}
        </div>

        {rest ? (
          <div className="flex flex-1 flex-col gap-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coffee className="size-4" />
              {t.plan.restDay}
            </p>
            <Link
              href={href}
              className="mt-auto text-sm font-medium text-primary hover:underline"
            >
              {t.plan.addWorkout}
            </Link>
          </div>
        ) : workout ? (
          <div className="flex flex-1 flex-col gap-2">
            <p className="line-clamp-2 text-sm font-medium">{workout.name}</p>
            <p className="mt-auto text-xs text-muted-foreground">
              {t.plan.exercises}: {workout.exercises.length} ·{" "}
              {formatMinutes(workout.estimatedDurationMin)}
            </p>
            {!completed ? (
              <Button size="sm" className="w-full" onClick={() => void handleStart()}>
                <Play className="size-4" />
                {t.activeWorkout.start}
              </Button>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <Link
                href={href}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t.plan.editWorkout}
              </Link>
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
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-center">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={href}>
                <Plus className="size-4" />
                {t.plan.planWorkout}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

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
