"use client";

import { useState } from "react";
import { Calculator, Check, ChevronRight, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { currentExercise, currentSet, suggestedReps } from "@/lib/session-utils";
import { useActiveSessionStore } from "@/store";
import type { ActiveSession } from "@/types";
import { PlateCalculatorDialog } from "./plate-calculator-dialog";

function Stepper({
  label,
  display,
  onDec,
  onInc,
  disabled,
}: {
  label: string;
  display: string;
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center justify-between gap-1 rounded-lg border border-input bg-card px-1 py-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onDec}
          disabled={disabled}
          aria-label={`${label} -`}
        >
          <Minus className="size-4" />
        </Button>
        <span className="min-w-0 flex-1 text-center text-base font-semibold tabular-nums">
          {display}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onInc}
          disabled={disabled}
          aria-label={`${label} +`}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function SetLogger({ session }: { session: ActiveSession }) {
  const t = useDictionary();
  const editCurrentSet = useActiveSessionStore((s) => s.editCurrentSet);
  const setRestForCurrentSet = useActiveSessionStore((s) => s.setRestForCurrentSet);
  const completeSet = useActiveSessionStore((s) => s.completeSet);
  const skipRest = useActiveSessionStore((s) => s.skipRest);
  const addSet = useActiveSessionStore((s) => s.addSet);
  const removeSet = useActiveSessionStore((s) => s.removeSet);

  const [plateDialogOpen, setPlateDialogOpen] = useState(false);
  const ex = currentExercise(session);
  const cur = currentSet(session);
  if (!ex || !cur) return null;

  const isResting = session.status === "resting";
  const reps = cur.actualReps ?? suggestedReps(cur.targetReps);
  const weight = cur.actualWeightKg ?? cur.targetWeightKg;
  const restSec = isResting ? session.restTargetSec : cur.restTargetSec;

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
          label={t.activeWorkout.reps}
          display={String(reps)}
          onDec={() => editCurrentSet({ actualReps: reps - 1 })}
          onInc={() => editCurrentSet({ actualReps: reps + 1 })}
        />
        <Stepper
          label={`${t.activeWorkout.weight} (${t.units.kg})`}
          display={String(weight)}
          onDec={() => editCurrentSet({ actualWeightKg: weight - 2.5 })}
          onInc={() => editCurrentSet({ actualWeightKg: weight + 2.5 })}
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
        label={`${t.activeWorkout.rest} (${t.units.sec})`}
        display={String(restSec)}
        onDec={() => setRestForCurrentSet(restSec - 15)}
        onInc={() => setRestForCurrentSet(restSec + 15)}
      />

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

      {isResting ? (
        <Button className="h-12 w-full text-base" onClick={() => skipRest()}>
          <ChevronRight className="size-5" />
          {t.activeWorkout.nextSet}
        </Button>
      ) : (
        <Button className="h-12 w-full text-base" onClick={() => completeSet()}>
          <Check className="size-5" />
          {t.activeWorkout.completeSet}
        </Button>
      )}

      <PlateCalculatorDialog
        open={plateDialogOpen}
        onOpenChange={setPlateDialogOpen}
        initialWeightKg={weight}
      />
    </div>
  );
}
