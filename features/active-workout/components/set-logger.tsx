"use client";

import { useState } from "react";
import { Calculator, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stepper } from "@/components/ui/stepper";
import { useDictionary } from "@/hooks/use-dictionary";
import {
  currentExercise,
  currentSet,
  loggingTarget,
  suggestedReps,
} from "@/lib/session-utils";
import { useActiveSessionStore } from "@/store";
import type { ActiveSession, LoggedSet } from "@/types";
import { PlateCalculatorDialog } from "./plate-calculator-dialog";
import { RPESelector } from "./rpe-selector";

/**
 * RPE + notes block bound to the "logging target" (the set we should be capturing
 * metadata for right now). Local notes state with onBlur commit avoids polluting
 * the undo stack on every keystroke. Remounted (via `key`) whenever the target
 * changes — e.g. when the workout transitions from executing to resting.
 */
function RpeAndNotes({
  target,
  exerciseIndex,
  onCommit,
}: {
  target: LoggedSet;
  exerciseIndex: number;
  onCommit: (
    exerciseIndex: number,
    setId: string,
    patch: Partial<Pick<LoggedSet, "rpe" | "notes">>,
  ) => void;
}) {
  const t = useDictionary();
  const [notesLocal, setNotesLocal] = useState(target.notes ?? "");

  return (
    <div className="space-y-3">
      <RPESelector
        value={target.rpe}
        onChange={(v) => onCommit(exerciseIndex, target.id, { rpe: v })}
        label={t.activeWorkout.rpeFor.replace("{n}", String(target.setNumber))}
      />
      <div className="space-y-1.5">
        <Label htmlFor={`notes-${target.id}`} className="text-xs text-muted-foreground">
          {t.activeWorkout.notesFor.replace("{n}", String(target.setNumber))}
        </Label>
        <Input
          id={`notes-${target.id}`}
          value={notesLocal}
          onChange={(e) => setNotesLocal(e.target.value)}
          onBlur={() => {
            if (notesLocal !== (target.notes ?? "")) {
              onCommit(exerciseIndex, target.id, { notes: notesLocal });
            }
          }}
          placeholder={t.activeWorkout.notesPlaceholder}
        />
      </div>
    </div>
  );
}

export function SetLogger({ session }: { session: ActiveSession }) {
  const t = useDictionary();
  const editCurrentSet = useActiveSessionStore((s) => s.editCurrentSet);
  const editSet = useActiveSessionStore((s) => s.editSet);
  const setRestForCurrentSet = useActiveSessionStore((s) => s.setRestForCurrentSet);
  const addSet = useActiveSessionStore((s) => s.addSet);
  const removeSet = useActiveSessionStore((s) => s.removeSet);

  const [plateDialogOpen, setPlateDialogOpen] = useState(false);
  const ex = currentExercise(session);
  const cur = currentSet(session);
  if (!ex || !cur) return null;

  const reps = cur.actualReps ?? suggestedReps(cur.targetReps);
  const weight = cur.actualWeightKg ?? cur.targetWeightKg;
  const restSec = cur.restTargetSec;
  const logTarget = loggingTarget(session);

  const lastPending = [...ex.sets].reverse().find((s) => s.status === "pending");
  const canRemove =
    lastPending != null &&
    !(
      session.exercises.indexOf(ex) === session.currentExerciseIndex &&
      ex.sets.indexOf(lastPending) === session.currentSetIndex
    );

  return (
    <div className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <span className="font-heading text-sm font-semibold">
          {t.activeWorkout.setOf
            .replace("{current}", String(cur.setNumber))
            .replace("{total}", String(ex.sets.length))}
        </span>
        <span className="text-xs text-muted-foreground">
          {t.activeWorkout.target}: {cur.targetReps} · {cur.targetWeightKg}
          {t.units.kg}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stepper
          size="lg"
          label={t.activeWorkout.reps}
          display={String(reps)}
          onDecrement={() => editCurrentSet({ actualReps: reps - 1 })}
          onIncrement={() => editCurrentSet({ actualReps: reps + 1 })}
        />
        <Stepper
          size="lg"
          label={`${t.activeWorkout.weight} (${t.units.kg})`}
          display={String(weight)}
          onDecrement={() => editCurrentSet({ actualWeightKg: weight - 2.5 })}
          onIncrement={() => editCurrentSet({ actualWeightKg: weight + 2.5 })}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPlateDialogOpen(true)}
        >
          <Calculator className="size-3.5" />
          {t.plates.button}
        </Button>
      </div>

      <Stepper
        size="lg"
        label={`${t.activeWorkout.rest} (${t.units.sec})`}
        display={String(restSec)}
        onDecrement={() => setRestForCurrentSet(restSec - 15)}
        onIncrement={() => setRestForCurrentSet(restSec + 15)}
      />

      {logTarget ? (
        <RpeAndNotes
          key={logTarget.set.id}
          target={logTarget.set}
          exerciseIndex={logTarget.exerciseIndex}
          onCommit={editSet}
        />
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{t.activeWorkout.set}</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => removeSet(session.currentExerciseIndex, lastPending!.id)}
            disabled={!canRemove}
          >
            <Minus className="size-3.5" />
            {t.activeWorkout.removeSet}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addSet(session.currentExerciseIndex)}
          >
            <Plus className="size-3.5" />
            {t.activeWorkout.addSet}
          </Button>
        </div>
      </div>

      <PlateCalculatorDialog
        open={plateDialogOpen}
        onOpenChange={setPlateDialogOpen}
        initialWeightKg={weight}
      />
    </div>
  );
}
