"use client";

import { useState } from "react";

import {
  AppSheet,
  AppSheetBody,
  AppSheetFooter,
} from "@/components/ui/app-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { useDictionary } from "@/hooks/use-dictionary";
import { GOAL_TYPES, type Goal, type GoalType } from "@/types";

interface GoalFormValue {
  type: GoalType;
  target: number;
}

function GoalFormBody({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Goal | null;
  onSubmit: (value: GoalFormValue) => void;
  onCancel: () => void;
}) {
  const t = useDictionary();
  const [type, setType] = useState<GoalType>(initial?.type ?? "workouts_weekly");
  const [target, setTarget] = useState(
    initial?.target != null ? String(initial.target) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number.parseInt(target.replace(/\s/g, ""), 10);
    if (!Number.isFinite(value) || value <= 0) {
      setError(t.goals.targetError);
      return;
    }
    onSubmit({ type, target: value });
  };

  return (
    <form onSubmit={handleSubmit} className="contents">
      <AppSheetBody className="grid gap-4">
        <div className="space-y-1.5">
          <Label>{t.goals.typeLabel}</Label>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_TYPES.map((option) => (
              <ToggleChip
                key={option}
                size="sm"
                selected={type === option}
                disabled={initial !== null}
                onClick={() => setType(option)}
              >
                {t.goals.types[option]}
              </ToggleChip>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="goal-target">
            {t.goals.targetLabel} ({t.goals.unit[type]})
          </Label>
          <Input
            id="goal-target"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            autoFocus
          />
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </AppSheetBody>

      <AppSheetFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button type="submit">{t.common.save}</Button>
      </AppSheetFooter>
    </form>
  );
}

export function GoalFormSheet({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Goal | null;
  onSubmit: (value: GoalFormValue) => void;
}) {
  const t = useDictionary();

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? t.goals.editGoal : t.goals.addGoal}
      size="sm"
    >
      {open ? (
        <GoalFormBody
          initial={initial ?? null}
          onSubmit={(value) => {
            onSubmit(value);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </AppSheet>
  );
}
