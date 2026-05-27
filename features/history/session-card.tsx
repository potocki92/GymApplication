"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  HeartPulse,
  Layers,
  Repeat,
  Star,
  TimerReset,
  Trash2,
  Weight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getExerciseById } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatClock, formatVolume, formatWeekdayDatePL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExerciseHistoryRecord, SessionHistoryRecord } from "@/types";

function epochToISODate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

interface SessionCardProps {
  session: SessionHistoryRecord;
  setsForSession: ExerciseHistoryRecord[];
  onDelete?: (id: string) => void;
}

export function SessionCard({
  session,
  setsForSession,
  onDelete,
}: SessionCardProps) {
  const t = useDictionary();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Bucket records by exerciseId, keep insertion order.
  const byExercise = new Map<string, ExerciseHistoryRecord[]>();
  for (const r of setsForSession) {
    const arr = byExercise.get(r.exerciseId) ?? [];
    arr.push(r);
    byExercise.set(r.exerciseId, arr);
  }

  return (
    <article className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <header className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 font-heading text-base font-semibold">
              {session.workoutName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatWeekdayDatePL(epochToISODate(session.finishedAt))}
            </p>
          </div>
          {session.rating != null ? (
            <div
              className="flex items-center gap-0.5 text-primary"
              aria-label={`rating-${session.rating}`}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={cn(
                    "size-3.5",
                    n <= session.rating! ? "fill-primary" : "opacity-30",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>

        <ul className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <Stat
            icon={<TimerReset className="size-3.5" />}
            label={t.history.cardLabels.duration}
            value={formatClock(session.totalActiveMs)}
          />
          <Stat
            icon={<Weight className="size-3.5" />}
            label={t.history.cardLabels.volume}
            value={formatVolume(session.totalVolumeKg)}
          />
          <Stat
            icon={<Layers className="size-3.5" />}
            label={t.history.cardLabels.sets}
            value={String(session.setsCompleted)}
          />
          <Stat
            icon={<Repeat className="size-3.5" />}
            label={t.history.cardLabels.reps}
            value={String(session.repsCompleted)}
          />
          <Stat
            icon={<Dumbbell className="size-3.5" />}
            label={t.history.cardLabels.exercises}
            value={String(session.exercisesCount)}
          />
          {session.avgHrBpm != null ? (
            <Stat
              icon={<HeartPulse className="size-3.5" />}
              label={t.history.cardLabels.avgHr}
              value={`${session.avgHrBpm} bpm`}
            />
          ) : null}
        </ul>

        {session.note ? (
          <p className="rounded-md bg-muted/40 px-2 py-1.5 text-xs italic text-muted-foreground">
            <span className="font-medium not-italic text-foreground">
              {t.history.notePrefix}
            </span>{" "}
            {session.note}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setExpanded((v) => !v)}
            disabled={setsForSession.length === 0}
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3.5" />
                {t.history.collapse}
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" />
                {t.history.expand}
              </>
            )}
          </Button>
          {onDelete ? (
            <Button
              variant="ghost"
              size="xs"
              aria-label={t.history.deleteCta}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </header>

      {expanded && setsForSession.length > 0 ? (
        <div className="border-t border-border/60 bg-card/40 p-3">
          <ul className="space-y-2">
            {Array.from(byExercise.entries()).map(([exerciseId, rows]) => {
              const meta = getExerciseById(exerciseId);
              return (
                <li key={exerciseId} className="space-y-1.5">
                  <p className="text-xs font-semibold">
                    {meta?.name ?? exerciseId}
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {rows
                      .sort((a, b) => a.setNumber - b.setNumber)
                      .map((r) => (
                        <li
                          key={r.id}
                          className="rounded-md bg-muted/50 px-2 py-1 text-xs tabular-nums text-muted-foreground"
                        >
                          <span className="font-medium text-foreground">
                            {r.reps}×{r.weightKg}
                          </span>{" "}
                          {t.units.kg}
                          {r.rpe != null ? (
                            <span className="ml-1 text-[0.65rem]">RPE {r.rpe}</span>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.history.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{t.history.deleteConfirmDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDelete(false);
                onDelete?.(session.id);
              }}
            >
              {t.history.deleteCta}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center gap-1.5 text-muted-foreground">
      <span className="text-foreground/80">{icon}</span>
      <span className="text-[0.7rem] uppercase tracking-wide">{label}</span>
      <span className="ml-auto font-semibold text-foreground tabular-nums">
        {value}
      </span>
    </li>
  );
}
