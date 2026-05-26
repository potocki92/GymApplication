"use client";

import { Check } from "lucide-react";

import { ExerciseIcon } from "@/components/shared/exercise-icon";
import { MuscleBadge } from "@/components/shared/muscle-badge";
import { Progress } from "@/components/ui/progress";
import { getExerciseById } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { currentExercise, setProgress } from "@/lib/session-utils";
import { cn } from "@/lib/utils";
import type { ActiveSession } from "@/types";

export function CurrentExercisePanel({ session }: { session: ActiveSession }) {
  const t = useDictionary();
  const ex = currentExercise(session);
  if (!ex) return null;

  const meta = getExerciseById(ex.exerciseId);
  const progress = setProgress(session);
  const pct = progress.total === 0 ? 0 : (progress.done / progress.total) * 100;

  return (
    <div className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start gap-3">
        {meta ? (
          <ExerciseIcon muscleGroup={meta.muscleGroup} category={meta.category} />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {t.activeWorkout.exerciseOf
              .replace("{current}", String(session.currentExerciseIndex + 1))
              .replace("{total}", String(session.exercises.length))}
          </p>
          <p className="font-heading text-base font-semibold">
            {meta?.name ?? t.activeWorkout.exercise}
          </p>
          {meta ? <MuscleBadge group={meta.muscleGroup} className="mt-1" /> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ex.sets.map((s, i) => {
          const isCurrent = i === session.currentSetIndex;
          return (
            <span
              key={s.id}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium tabular-nums ring-1 ring-foreground/10",
                s.status === "completed" && "bg-success/15 text-success",
                s.status === "skipped" &&
                  "bg-muted text-muted-foreground line-through",
                s.status === "active" && "bg-primary/15 text-primary",
                s.status === "pending" && "bg-muted/50 text-muted-foreground",
                isCurrent && "ring-2 ring-primary/50",
              )}
            >
              {s.status === "completed" ? (
                <Check className="size-3" />
              ) : (
                <span>{s.setNumber}.</span>
              )}
              {s.status === "completed"
                ? `${s.actualReps ?? 0}×${s.actualWeightKg ?? 0}${t.units.kg}`
                : `${s.targetReps}`}
            </span>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t.activeWorkout.progress}</span>
          <span className="tabular-nums">
            {t.activeWorkout.setsDone
              .replace("{done}", String(progress.done))
              .replace("{total}", String(progress.total))}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
    </div>
  );
}
