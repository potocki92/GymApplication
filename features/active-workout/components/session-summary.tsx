"use client";

import type { ReactNode } from "react";
import {
  CheckCircle2,
  Dumbbell,
  Layers,
  TimerReset,
  Trophy,
  Weight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getExerciseById } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatClock, formatVolume } from "@/lib/format";
import { detectNewPRs } from "@/lib/pr-utils";
import {
  setProgress,
  toCompletedSession,
  totalCompletedVolume,
} from "@/lib/session-utils";
import { useHistoryStore } from "@/store";
import type { ActiveSession } from "@/types";

function StatRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-base font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function SessionSummary({
  session,
  onSave,
  onDiscard,
}: {
  session: ActiveSession;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const t = useDictionary();
  const completed = toCompletedSession(session);
  const progress = setProgress(session);
  const volume = totalCompletedVolume(session);

  // Compare this session against history that excludes its own records (which
  // are only persisted on save) so the badges reflect real all-time PRs.
  const allRecords = useHistoryStore((s) => s.records);
  const priorHistory = allRecords.filter((r) => r.sessionId !== session.id);
  const newPRs = detectNewPRs(completed, priorHistory);

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {t.activeWorkout.summary.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.activeWorkout.summary.subtitle}
        </p>
        <p className="font-heading text-base font-semibold">{session.workoutName}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatRow
          icon={<TimerReset className="size-5" />}
          label={t.activeWorkout.summary.duration}
          value={formatClock(completed.totalActiveMs)}
        />
        <StatRow
          icon={<Layers className="size-5" />}
          label={t.activeWorkout.summary.sets}
          value={`${progress.done} / ${progress.total}`}
        />
        <StatRow
          icon={<Weight className="size-5" />}
          label={t.activeWorkout.summary.volume}
          value={formatVolume(volume)}
        />
        <StatRow
          icon={<Dumbbell className="size-5" />}
          label={t.activeWorkout.summary.exercises}
          value={String(session.exercises.length)}
        />
      </div>

      {newPRs.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-primary">
              {t.activeWorkout.summary.newPRsTitle}
            </h2>
          </div>
          <ul className="space-y-2">
            {newPRs.map((pr) => {
              const ex = getExerciseById(pr.exerciseId);
              const delta = Math.round((pr.newOneRMKg - pr.previousOneRMKg) * 10) / 10;
              return (
                <li
                  key={pr.exerciseId}
                  className="flex items-center gap-3 rounded-xl bg-primary/10 p-3 ring-1 ring-primary/30"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Trophy className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">
                      {ex?.name ?? pr.exerciseId}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {pr.setWeightKg} {t.units.kg} × {pr.setReps}
                      {" · "}
                      {pr.previousOneRMKg > 0
                        ? t.activeWorkout.summary.newPRDelta.replace(
                            "{delta}",
                            String(delta),
                          )
                        : t.activeWorkout.summary.firstPR}
                    </p>
                  </div>
                  <span className="shrink-0 text-right font-heading text-sm font-bold tabular-nums text-primary">
                    {pr.newOneRMKg} {t.units.kg}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button className="h-11 w-full text-base" onClick={onSave}>
          {t.activeWorkout.summary.save}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onDiscard}>
          {t.activeWorkout.summary.discard}
        </Button>
      </div>
    </div>
  );
}
