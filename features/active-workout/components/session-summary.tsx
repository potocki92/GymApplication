"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  Home,
  Layers,
  LineChart,
  RotateCcw,
  Save,
  Star,
  TimerReset,
  Trophy,
  Weight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getExerciseById } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatClock, formatVolume } from "@/lib/format";
import { detectNewPRs } from "@/lib/pr-utils";
import {
  setProgress,
  toCompletedSession,
  totalCompletedVolume,
} from "@/lib/session-utils";
import { cn } from "@/lib/utils";
import { useHistoryStore } from "@/store";
import type { ActiveSession } from "@/types";
import { AddExerciseSheet } from "./add-exercise-sheet";

function StatTile({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10",
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-heading text-base font-semibold tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value != null && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "rounded p-1 transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Star
              className={cn("size-6", active ? "fill-primary stroke-primary" : "")}
            />
          </button>
        );
      })}
    </div>
  );
}

interface SessionSummaryProps {
  session: ActiveSession;
  /** Persists the session — receives the rating + note from the summary form. */
  onSave: (meta: { rating?: number; note?: string }) => void;
  onDiscard: () => void;
  /** Start a fresh session from the same workoutId. */
  onRepeat?: () => void;
  saving?: boolean;
}

export function SessionSummary({
  session,
  onSave,
  onDiscard,
  onRepeat,
  saving = false,
}: SessionSummaryProps) {
  const t = useDictionary();
  const completed = toCompletedSession(session);
  const progress = setProgress(session);
  const volume = totalCompletedVolume(session);
  const totalReps = session.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce(
        (s, set) => (set.status === "completed" ? s + (set.actualReps ?? 0) : s),
        0,
      ),
    0,
  );

  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState<string>("");

  const allRecords = useHistoryStore((s) => s.records);
  const priorHistory = allRecords.filter((r) => r.sessionId !== session.id);
  const newPRs = detectNewPRs(completed, priorHistory);

  const hr = session.heartRate;

  const handleSave = () => {
    onSave({
      rating: rating ?? undefined,
      note: note.trim().length > 0 ? note.trim() : undefined,
    });
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon={<TimerReset className="size-5" />}
          label={t.activeWorkout.summary.duration}
          value={formatClock(completed.totalActiveMs)}
        />
        <StatTile
          icon={<Layers className="size-5" />}
          label={t.activeWorkout.summary.sets}
          value={`${progress.done} / ${progress.total}`}
        />
        <StatTile
          icon={<Dumbbell className="size-5" />}
          label={t.activeWorkout.summary.exercises}
          value={String(session.exercises.length)}
        />
        <StatTile
          icon={<ArrowRight className="size-5" />}
          label={t.activeWorkout.summary.reps}
          value={String(totalReps)}
        />
        <StatTile
          icon={<Weight className="size-5" />}
          label={t.activeWorkout.summary.volume}
          value={formatVolume(volume)}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Heart-rate strip: shows data when available, otherwise an empty
          placeholder pointing at the Garmin integration (Etap 5). */}
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <HeartPulse className="size-3.5" />
          {t.activeWorkout.heartRate.title}
        </div>
        {hr && (hr.avgBpm != null || hr.maxBpm != null) ? (
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm tabular-nums">
            <div>
              <p className="text-xs text-muted-foreground">
                {t.activeWorkout.summary.avgHr}
              </p>
              <p className="font-heading text-lg font-semibold">
                {hr.avgBpm ?? "—"} bpm
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t.activeWorkout.summary.maxHr}
              </p>
              <p className="font-heading text-lg font-semibold">
                {hr.maxBpm ?? "—"} bpm
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            {t.activeWorkout.summary.hrPlaceholder}
          </p>
        )}
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

      <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div>
          <Label className="text-sm">{t.activeWorkout.summary.ratingLabel}</Label>
          <p className="text-xs text-muted-foreground">
            {t.activeWorkout.summary.ratingHint}
          </p>
          <div className="mt-2">
            <StarRating value={rating} onChange={setRating} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="session-note" className="text-sm">
            {t.activeWorkout.summary.noteLabel}
          </Label>
          <Input
            id="session-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.activeWorkout.summary.notePlaceholder}
          />
        </div>
      </section>

      <div className="space-y-2">
        <Button
          className="h-11 w-full text-base"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="size-5" />
          {saving ? t.activeWorkout.summary.saving : t.activeWorkout.summary.save}
        </Button>

        {/* Adding an exercise re-opens the session so it can be performed; it
            affects this session only, never the weekly plan. */}
        <AddExerciseSheet session={session} />
        <p className="text-center text-xs text-muted-foreground">
          {t.activeWorkout.addExerciseHint}
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {onRepeat ? (
            <Button variant="outline" onClick={onRepeat} disabled={saving}>
              <RotateCcw className="size-4" />
              {t.activeWorkout.summary.repeat}
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/progress">
              <LineChart className="size-4" />
              {t.activeWorkout.summary.viewProgress}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="size-4" />
              {t.activeWorkout.summary.backToDashboard}
            </Link>
          </Button>
        </div>

        <Button variant="ghost" className="w-full" onClick={onDiscard} disabled={saving}>
          {t.activeWorkout.summary.discard}
        </Button>
      </div>
    </div>
  );
}
