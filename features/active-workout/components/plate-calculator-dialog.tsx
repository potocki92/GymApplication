"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDictionary } from "@/hooks/use-dictionary";
import { calculatePlates, DEFAULT_BAR_KG } from "@/lib/plate-utils";

function groupPlates(plates: number[]): { size: number; count: number }[] {
  const map = new Map<number, number>();
  for (const p of plates) map.set(p, (map.get(p) ?? 0) + 1);
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([size, count]) => ({ size, count }));
}

function PlateCalculatorBody({ initialWeightKg }: { initialWeightKg: number }) {
  const t = useDictionary();
  const [weight, setWeight] = useState(initialWeightKg);
  const [bar, setBar] = useState(DEFAULT_BAR_KG);

  const result = calculatePlates(weight, bar);
  const grouped = groupPlates(result.plates);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.plates.title}</DialogTitle>
        <DialogDescription>{t.plates.subtitle}</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">{t.plates.target}</span>
          <div className="flex items-center justify-between gap-1 rounded-lg border border-input bg-card px-1 py-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setWeight((w) => Math.max(0, w - 2.5))}
              aria-label="-"
            >
              <Minus className="size-4" />
            </Button>
            <span className="min-w-0 flex-1 text-center text-base font-semibold tabular-nums">
              {weight} {t.units.kg}
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setWeight((w) => w + 2.5)}
              aria-label="+"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">{t.plates.bar}</span>
          <div className="flex items-center justify-between gap-1 rounded-lg border border-input bg-card px-1 py-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setBar((b) => Math.max(0, b - 5))}
              aria-label="-"
            >
              <Minus className="size-4" />
            </Button>
            <span className="min-w-0 flex-1 text-center text-base font-semibold tabular-nums">
              {bar} {t.units.kg}
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setBar((b) => b + 5)}
              aria-label="+"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {result.belowBar ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t.plates.belowBar}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
            <span className="text-sm font-medium text-primary">
              {t.plates.perSide}
            </span>
            <span className="font-heading text-lg font-bold tabular-nums text-primary">
              {result.perSide} {t.units.kg}
            </span>
          </div>

          {grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.plates.noPlates}</p>
          ) : (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">
                {t.plates.plates}
              </span>
              <div className="flex flex-wrap gap-2">
                {grouped.map(({ size, count }) => (
                  <span
                    key={size}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-sm font-medium ring-1 ring-foreground/10 tabular-nums"
                  >
                    <span>
                      {size} {t.units.kg}
                    </span>
                    <span className="text-muted-foreground">
                      {t.plates.each.replace("{count}", String(count))}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.remainder > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t.plates.remainder}: {result.remainder} {t.units.kg}
            </p>
          ) : null}
        </div>
      )}
    </>
  );
}

export function PlateCalculatorDialog({
  open,
  onOpenChange,
  initialWeightKg,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWeightKg: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? <PlateCalculatorBody initialWeightKg={initialWeightKg} /> : null}
      </DialogContent>
    </Dialog>
  );
}
