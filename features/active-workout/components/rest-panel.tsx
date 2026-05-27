"use client";

import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getExerciseById } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatClock } from "@/lib/format";
import {
  currentExercise,
  loggingTarget,
  type ClockValues,
} from "@/lib/session-utils";
import { cn } from "@/lib/utils";
import { useActiveSessionStore } from "@/store";
import type { ActiveSession, LoggedSet } from "@/types";
import { RPESelector } from "./rpe-selector";

const RING_RADIUS = 64;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function RestRpeAndNotes({
  target,
  exerciseIndex,
}: {
  target: LoggedSet;
  exerciseIndex: number;
}) {
  const t = useDictionary();
  const editSet = useActiveSessionStore((s) => s.editSet);
  const [notesLocal, setNotesLocal] = useState(target.notes ?? "");

  return (
    <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <RPESelector
        value={target.rpe}
        onChange={(v) => editSet(exerciseIndex, target.id, { rpe: v })}
        label={t.activeWorkout.rpeFor.replace("{n}", String(target.setNumber))}
      />
      <div className="space-y-1.5">
        <Label
          htmlFor={`rest-notes-${target.id}`}
          className="text-xs text-muted-foreground"
        >
          {t.activeWorkout.notesFor.replace("{n}", String(target.setNumber))}
        </Label>
        <Input
          id={`rest-notes-${target.id}`}
          value={notesLocal}
          onChange={(e) => setNotesLocal(e.target.value)}
          onBlur={() => {
            if (notesLocal !== (target.notes ?? "")) {
              editSet(exerciseIndex, target.id, { notes: notesLocal });
            }
          }}
          placeholder={t.activeWorkout.notesPlaceholder}
        />
      </div>
    </div>
  );
}

export function RestPanel({
  session,
  clock,
}: {
  session: ActiveSession;
  clock: ClockValues;
}) {
  const t = useDictionary();
  const setRestForCurrentSet = useActiveSessionStore(
    (s) => s.setRestForCurrentSet,
  );
  const target = session.restTargetSec * 1000;
  const remaining = clock.restRemainingMs;
  const pct = target > 0 ? Math.min(1, Math.max(0, 1 - remaining / target)) : 1;
  const dashOffset = RING_CIRC * (1 - pct);

  const isAlmostDone = !clock.restDone && remaining <= 5000;
  const isLowTime = !clock.restDone && remaining <= 10000 && remaining > 5000;

  const upcomingExercise = currentExercise(session);
  const upcomingMeta = upcomingExercise
    ? getExerciseById(upcomingExercise.exerciseId)
    : null;
  const logTarget = loggingTarget(session);

  const ringColor = clock.restDone
    ? "stroke-destructive"
    : isAlmostDone
      ? "stroke-warning"
      : "stroke-primary";
  const textColor = clock.restDone
    ? "text-destructive"
    : isAlmostDone
      ? "text-warning"
      : "text-foreground";

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {clock.restDone
            ? t.activeWorkout.restDoneHeadline
            : t.activeWorkout.restRunningHeadline}
        </p>

        <motion.div
          className="relative flex size-44 items-center justify-center"
          animate={
            isAlmostDone
              ? { scale: [1, 1.04, 1] }
              : { scale: 1 }
          }
          transition={
            isAlmostDone
              ? { repeat: Infinity, duration: 1, ease: "easeInOut" }
              : { duration: 0.2 }
          }
        >
          <svg
            viewBox="0 0 160 160"
            className="size-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="80"
              cy="80"
              r={RING_RADIUS}
              className="stroke-muted/40"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="80"
              cy="80"
              r={RING_RADIUS}
              className={cn("transition-colors duration-200", ringColor)}
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 200ms linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "font-heading text-4xl font-bold tabular-nums",
                textColor,
                isLowTime && "text-warning",
              )}
            >
              {formatClock(remaining)}
            </span>
            <span className="text-[0.7rem] text-muted-foreground uppercase tracking-wide">
              {t.units.sec}
            </span>
          </div>
        </motion.div>

        {upcomingMeta ? (
          <p className="line-clamp-1 text-center text-sm text-muted-foreground">
            {t.activeWorkout.nextUpExercise.replace(
              "{name}",
              upcomingMeta.name,
            )}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRestForCurrentSet(session.restTargetSec - 15)}
            aria-label={t.activeWorkout.subRestSec}
          >
            <Minus className="size-3.5" />
            15s
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRestForCurrentSet(session.restTargetSec + 15)}
            aria-label={t.activeWorkout.addRestSec}
          >
            <Plus className="size-3.5" />
            15s
          </Button>
        </div>
      </div>

      {logTarget ? (
        <RestRpeAndNotes
          key={logTarget.set.id}
          target={logTarget.set}
          exerciseIndex={logTarget.exerciseIndex}
        />
      ) : null}
    </div>
  );
}
