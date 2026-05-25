"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/hooks/use-dictionary";
import type { WorkoutExercise } from "@/types";

function Stepper({
  label,
  display,
  onDec,
  onInc,
}: {
  label: string;
  display: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center justify-between gap-1 rounded-lg border border-input bg-card px-1 py-1">
        <Button type="button" size="icon-sm" variant="ghost" onClick={onDec}>
          <Minus className="size-3.5" />
        </Button>
        <span className="min-w-0 flex-1 text-center text-sm font-medium tabular-nums">
          {display}
        </span>
        <Button type="button" size="icon-sm" variant="ghost" onClick={onInc}>
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ExerciseConfigPanel({
  value,
  onChange,
}: {
  value: WorkoutExercise;
  onChange: (patch: Partial<WorkoutExercise>) => void;
}) {
  const t = useDictionary();

  return (
    <div className="grid grid-cols-2 gap-3">
      <Stepper
        label={t.workoutForm.sets}
        display={String(value.sets)}
        onDec={() => onChange({ sets: Math.max(1, value.sets - 1) })}
        onInc={() => onChange({ sets: value.sets + 1 })}
      />

      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">{t.workoutForm.reps}</span>
        <Input
          value={value.reps}
          onChange={(e) => onChange({ reps: e.target.value })}
          className="h-[2.375rem] text-center"
          aria-label={t.workoutForm.reps}
        />
      </div>

      <Stepper
        label={t.workoutForm.weight}
        display={`${value.weightKg} ${t.units.kg}`}
        onDec={() => onChange({ weightKg: Math.max(0, value.weightKg - 2.5) })}
        onInc={() => onChange({ weightKg: value.weightKg + 2.5 })}
      />

      <Stepper
        label={t.workoutForm.rest}
        display={`${value.restSec} ${t.units.sec}`}
        onDec={() => onChange({ restSec: Math.max(0, value.restSec - 15) })}
        onInc={() => onChange({ restSec: value.restSec + 15 })}
      />
    </div>
  );
}
