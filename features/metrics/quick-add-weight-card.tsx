"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/hooks/use-dictionary";
import { uid } from "@/lib/session-utils";
import { latestForMetric } from "@/lib/metrics-utils";
import { useMetricsStore } from "@/store";
import type { BodyMetricRecord } from "@/types";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function QuickAddWeightCard() {
  const t = useDictionary();
  const [value, setValue] = useState("");
  const records = useMetricsStore((s) => s.records);
  const upsert = useMetricsStore((s) => s.upsert);

  const latest = latestForMetric(records, "weightKg");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Number.parseFloat(value.replace(",", "."));
    if (!Number.isFinite(w) || w <= 0) {
      toast.error(t.metrics.requiresWeight);
      return;
    }
    const today = todayISO();
    const existing = records.find((r) => r.date === today);
    const record: BodyMetricRecord = existing
      ? { ...existing, weightKg: Math.round(w * 10) / 10, updatedAt: Date.now() }
      : {
          id: `metric-${uid()}`,
          date: today,
          weightKg: Math.round(w * 10) / 10,
          updatedAt: Date.now(),
        };
    void upsert(record);
    toast.success(t.metrics.quickAddSaved);
    setValue("");
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Scale className="size-4" />
          {t.metrics.quickAddTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {latest ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">
              {latest.weightKg} {t.units.kg}
            </span>
            {" · "}
            {latest.date === todayISO() ? t.metrics.todayLabel : latest.date}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t.metrics.quickAddDesc}
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t.metrics.fields.weight}
            className="h-10"
            aria-label={t.metrics.fields.weight}
          />
          <Button type="submit" className="h-10 shrink-0">
            {t.metrics.quickAddSave}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
