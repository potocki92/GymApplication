"use client";

import { Pause } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { useDictionary } from "@/hooks/use-dictionary";
import { nextCursor, setProgress } from "@/lib/session-utils";
import { cn } from "@/lib/utils";
import type { ActiveSession, SessionStatus } from "@/types";

function isLastExercise(session: ActiveSession): boolean {
  for (let e = session.currentExerciseIndex + 1; e < session.exercises.length; e += 1) {
    if (session.exercises[e].sets.length > 0) return false;
  }
  return true;
}

function isLastPendingSet(session: ActiveSession): boolean {
  return (
    nextCursor(session, session.currentExerciseIndex, session.currentSetIndex) === null
  );
}

export function WorkoutHeader({
  session,
  status,
}: {
  session: ActiveSession;
  status: SessionStatus;
}) {
  const t = useDictionary();
  const progress = setProgress(session);
  const pct = progress.total === 0 ? 0 : (progress.done / progress.total) * 100;
  const exerciseIndex = session.currentExerciseIndex + 1;
  const totalExercises = session.exercises.length;
  const currentEx = session.exercises[session.currentExerciseIndex];
  const setIndex = (currentEx?.sets[session.currentSetIndex]?.setNumber ?? 1);
  const totalSets = currentEx?.sets.length ?? 0;
  const showFinalBadge = isLastPendingSet(session) && status !== "finished";
  const showLastExerciseBadge =
    !showFinalBadge && isLastExercise(session) && status !== "finished";

  return (
    <div
      className={cn(
        "sticky top-0 z-10 -mx-4 border-b border-border/60 bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="line-clamp-1 text-xs font-medium text-muted-foreground">
            {session.workoutName}
          </p>
          <p className="font-heading text-sm font-semibold tracking-tight tabular-nums">
            {t.activeWorkout.exerciseOf
              .replace("{current}", String(exerciseIndex))
              .replace("{total}", String(totalExercises))}
            <span className="mx-1.5 text-muted-foreground">·</span>
            {t.activeWorkout.setOf
              .replace("{current}", String(setIndex))
              .replace("{total}", String(totalSets))}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {status === "paused" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[0.7rem] font-medium text-primary">
              <Pause className="size-3" />
              {t.activeWorkout.paused}
            </span>
          ) : null}
          {showFinalBadge ? (
            <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[0.7rem] font-semibold text-warning">
              {t.activeWorkout.finalSetOfWorkout}
            </span>
          ) : showLastExerciseBadge ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.7rem] font-semibold text-primary">
              {t.activeWorkout.lastExerciseBadge}
            </span>
          ) : null}
        </div>
      </div>
      <Progress value={pct} className="mt-2 h-1.5" />
    </div>
  );
}
