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
import { useDictionary } from "@/hooks/use-dictionary";
import type { BodyMetricGoal } from "@/types";

function GoalEditorBody({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: BodyMetricGoal | null;
  onSubmit: (goal: BodyMetricGoal) => void;
  onCancel: () => void;
}) {
  const t = useDictionary();
  const [start, setStart] = useState(
    initial?.startKg != null ? String(initial.startKg) : "",
  );
  const [target, setTarget] = useState(
    initial?.targetKg != null ? String(initial.targetKg) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = Number.parseFloat(start.replace(",", "."));
    const tg = Number.parseFloat(target.replace(",", "."));
    if (
      !Number.isFinite(s) ||
      s <= 0 ||
      !Number.isFinite(tg) ||
      tg <= 0
    ) {
      setError(t.metrics.requiresWeight);
      return;
    }
    onSubmit({
      metric: "weightKg",
      startKg: Math.round(s * 10) / 10,
      targetKg: Math.round(tg * 10) / 10,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="contents">
      <AppSheetBody className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="goal-start">{t.metrics.goalSection.startKg}</Label>
          <Input
            id="goal-start"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal-target">{t.metrics.goalSection.targetKg}</Label>
          <Input
            id="goal-target"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </AppSheetBody>

      <AppSheetFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.metrics.cancel}
        </Button>
        <Button type="submit">{t.metrics.save}</Button>
      </AppSheetFooter>
    </form>
  );
}

export function GoalEditorSheet({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: BodyMetricGoal | null;
  onSubmit: (goal: BodyMetricGoal) => void;
}) {
  const t = useDictionary();

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.metrics.goalSection.title}
      size="sm"
    >
      {open ? (
        <GoalEditorBody
          initial={initial ?? null}
          onSubmit={(g) => {
            onSubmit(g);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </AppSheet>
  );
}
