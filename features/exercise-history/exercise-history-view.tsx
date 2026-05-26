"use client";

import Link from "next/link";
import { ArrowLeft, History, Trophy } from "lucide-react";

import { ExerciseIcon } from "@/components/shared/exercise-icon";
import { MuscleBadge } from "@/components/shared/muscle-badge";
import { Button } from "@/components/ui/button";
import { getExerciseById } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatShortWeekdayDatePL } from "@/lib/format";
import { bestPRForExercise, recentRecordsForExercise } from "@/lib/pr-utils";
import { useHistoryStore } from "@/store";

function epochToISODate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function ExerciseHistoryView({ exerciseId }: { exerciseId: string }) {
  const t = useDictionary();
  const exercise = getExerciseById(exerciseId);
  const records = useHistoryStore((s) => s.records);

  if (!exercise) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <p className="font-heading text-lg font-semibold">
          {t.exercises.detail.notFound}
        </p>
        <Button asChild>
          <Link href="/exercises">
            <ArrowLeft className="size-4" />
            {t.exercises.detail.back}
          </Link>
        </Button>
      </div>
    );
  }

  const pr = bestPRForExercise(records, exerciseId);
  const recent = recentRecordsForExercise(records, exerciseId, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/exercises">
            <ArrowLeft className="size-4" />
            {t.exercises.detail.back}
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <ExerciseIcon
          muscleGroup={exercise.muscleGroup}
          category={exercise.category}
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-bold tracking-tight">
            {exercise.name}
          </h1>
          <div className="mt-1.5 flex items-center gap-2">
            <MuscleBadge group={exercise.muscleGroup} />
            <span className="text-xs text-muted-foreground">
              {t.categories[exercise.category]}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Trophy className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t.exercises.pr}</p>
            {pr ? (
              <p className="font-heading text-base font-semibold tabular-nums">
                {pr.weightKg} {t.units.kg} × {pr.reps}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t.exercises.noPR}
              </p>
            )}
          </div>
          {pr ? (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {t.exercises.detail.estimated1RM}
              </p>
              <p className="font-heading text-lg font-bold tabular-nums">
                {pr.oneRMKg} {t.units.kg}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t.exercises.detail.recentSets}
          </h2>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border py-10 text-center">
            <p className="text-sm font-medium">{t.exercises.detail.noHistory}</p>
            <p className="text-xs text-muted-foreground">
              {t.exercises.detail.noHistoryHint}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <div className="grid grid-cols-[1.4fr_1fr_0.7fr_0.9fr] gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>{t.exercises.detail.columns.date}</span>
              <span className="text-right">{t.exercises.detail.columns.weight}</span>
              <span className="text-right">{t.exercises.detail.columns.reps}</span>
              <span className="text-right">{t.exercises.detail.columns.oneRM}</span>
            </div>
            {recent.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[1.4fr_1fr_0.7fr_0.9fr] gap-2 border-t border-border/60 px-3 py-2 text-sm tabular-nums first:border-t-0"
              >
                <span className="truncate">
                  {formatShortWeekdayDatePL(epochToISODate(r.completedAt))}
                </span>
                <span className="text-right">
                  {r.weightKg} {t.units.kg}
                </span>
                <span className="text-right">{r.reps}</span>
                <span className="text-right text-muted-foreground">
                  {r.oneRMKg}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
