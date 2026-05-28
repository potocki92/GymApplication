"use client";

import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { useDictionary } from "@/hooks/use-dictionary";
import type { WorkoutExercise } from "@/types";

export function ExerciseConfigPanel({
  value,
  onChange,
}: {
  value: WorkoutExercise;
  onChange: (patch: Partial<WorkoutExercise>) => void;
}) {
  const t = useDictionary();

  return (
    <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
      <Stepper
        size="sm"
        label={t.workoutForm.sets}
        display={String(value.sets)}
        onDecrement={() => onChange({ sets: Math.max(1, value.sets - 1) })}
        onIncrement={() => onChange({ sets: value.sets + 1 })}
      />

      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">{t.workoutForm.reps}</span>
        <Input
          size="lg"
          value={value.reps}
          onChange={(e) => onChange({ reps: e.target.value })}
          className="h-10 text-center"
          aria-label={t.workoutForm.reps}
        />
      </div>

      <Stepper
        size="sm"
        label={t.workoutForm.weight}
        display={`${value.weightKg} ${t.units.kg}`}
        onDecrement={() => onChange({ weightKg: Math.max(0, value.weightKg - 2.5) })}
        onIncrement={() => onChange({ weightKg: value.weightKg + 2.5 })}
      />

      <Stepper
        size="sm"
        label={t.workoutForm.rest}
        display={`${value.restSec} ${t.units.sec}`}
        onDecrement={() => onChange({ restSec: Math.max(0, value.restSec - 15) })}
        onIncrement={() => onChange({ restSec: value.restSec + 15 })}
      />
    </div>
  );
}
