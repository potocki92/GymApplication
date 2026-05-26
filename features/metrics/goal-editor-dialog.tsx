"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      <DialogHeader>
        <DialogTitle>{t.metrics.goalSection.title}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-3">
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
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t.metrics.cancel}
        </Button>
        <Button type="submit">{t.metrics.save}</Button>
      </DialogFooter>
    </form>
  );
}

export function GoalEditorDialog({
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
      </DialogContent>
    </Dialog>
  );
}
