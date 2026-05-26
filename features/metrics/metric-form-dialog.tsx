"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/hooks/use-dictionary";
import { uid } from "@/lib/session-utils";
import type { BodyMetricRecord } from "@/types";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseOptional(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number.parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function MetricFormBody({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: BodyMetricRecord | null;
  onSubmit: (record: BodyMetricRecord) => void;
  onCancel: () => void;
}) {
  const t = useDictionary();
  const defaultDate = useMemo(() => todayISO(), []);
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [weight, setWeight] = useState(
    initial?.weightKg != null ? String(initial.weightKg) : "",
  );
  const [chest, setChest] = useState(
    initial?.chestCm != null ? String(initial.chestCm) : "",
  );
  const [waist, setWaist] = useState(
    initial?.waistCm != null ? String(initial.waistCm) : "",
  );
  const [hips, setHips] = useState(
    initial?.hipsCm != null ? String(initial.hipsCm) : "",
  );
  const [bodyFat, setBodyFat] = useState(
    initial?.bodyFatPct != null ? String(initial.bodyFatPct) : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Number.parseFloat(weight.replace(",", "."));
    if (!Number.isFinite(w) || w <= 0) {
      setError(t.metrics.requiresWeight);
      return;
    }
    const record: BodyMetricRecord = {
      id: initial?.id ?? `metric-${uid()}`,
      date,
      weightKg: Math.round(w * 10) / 10,
      chestCm: parseOptional(chest),
      waistCm: parseOptional(waist),
      hipsCm: parseOptional(hips),
      bodyFatPct: parseOptional(bodyFat),
      notes: notes.trim() === "" ? undefined : notes.trim(),
      updatedAt: Date.now(),
    };
    onSubmit(record);
  };

  return (
    <form onSubmit={handleSubmit} className="contents">
      <DialogHeader>
        <DialogTitle>{t.metrics.detailedTitle}</DialogTitle>
        <DialogDescription>{t.metrics.detailedDesc}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="metric-date">{t.metrics.fields.date}</Label>
          <Input
            id="metric-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="metric-weight">{t.metrics.fields.weight}</Label>
          <Input
            id="metric-weight"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            aria-invalid={error != null}
            autoFocus
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="metric-chest">{t.metrics.fields.chest}</Label>
            <Input
              id="metric-chest"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={chest}
              onChange={(e) => setChest(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metric-waist">{t.metrics.fields.waist}</Label>
            <Input
              id="metric-waist"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metric-hips">{t.metrics.fields.hips}</Label>
            <Input
              id="metric-hips"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={hips}
              onChange={(e) => setHips(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metric-bf">{t.metrics.fields.bodyFat}</Label>
            <Input
              id="metric-bf"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="metric-notes">{t.metrics.fields.notes}</Label>
          <Input
            id="metric-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
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

export function MetricFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: BodyMetricRecord | null;
  onSubmit: (record: BodyMetricRecord) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <MetricFormBody
            initial={initial ?? null}
            onSubmit={(r) => {
              onSubmit(r);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
