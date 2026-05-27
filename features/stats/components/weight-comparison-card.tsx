"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Flag, Scale, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import type { WeightSummary } from "@/lib/stats-utils";
import { cn } from "@/lib/utils";

function formatKg(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)} kg`;
}

export function WeightComparisonCard({ summary }: { summary: WeightSummary }) {
  const t = useDictionary();
  const { startKg, currentKg, targetKg, deltaKg, remainingKg, direction } = summary;

  if (currentKg == null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t.stats.weight.title}
          </CardTitle>
          <CardDescription>{t.stats.weight.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t.stats.weight.noData}
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/progress">{t.stats.cta.addWeight}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const deltaIsLoss = deltaKg != null && deltaKg > 0;
  const deltaIsGain = deltaKg != null && deltaKg < 0;
  const deltaWanted = direction === "cut" ? deltaIsLoss : direction === "bulk" ? deltaIsGain : false;
  const deltaAccent: "success" | "destructive" | "default" = deltaWanted
    ? "success"
    : deltaKg != null && Math.abs(deltaKg) > 0 && direction != null
      ? "destructive"
      : "default";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.stats.weight.title}
        </CardTitle>
        <CardDescription>
          {direction === "cut"
            ? t.stats.weight.directionCut
            : direction === "bulk"
              ? t.stats.weight.directionBulk
              : t.stats.weight.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Column
            icon={Flag}
            label={t.stats.weight.start}
            value={formatKg(startKg)}
          />
          <Column
            icon={Scale}
            label={t.stats.weight.current}
            value={formatKg(currentKg)}
            highlight
          />
          <Column
            icon={Target}
            label={t.stats.weight.target}
            value={targetKg != null ? formatKg(targetKg) : t.stats.weight.noTarget}
          />
        </div>

        <div className="flex flex-wrap gap-3 border-t border-border/60 pt-3 text-sm">
          <Delta
            label={t.stats.weight.delta}
            sign={deltaKg}
            value={
              deltaKg == null
                ? "—"
                : deltaKg === 0
                  ? "0 kg"
                  : `${deltaIsLoss ? "−" : "+"}${Math.abs(deltaKg).toFixed(1)} kg`
            }
            accent={deltaAccent}
          />
          {remainingKg != null ? (
            <Delta
              label={t.stats.weight.remaining}
              value={remainingKg === 0 ? "0 kg" : `${remainingKg.toFixed(1)} kg`}
              accent="default"
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Column({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Flag;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "font-heading text-xl font-semibold tabular-nums sm:text-2xl",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Delta({
  label,
  value,
  sign,
  accent,
}: {
  label: string;
  value: string;
  sign?: number | null;
  accent: "success" | "destructive" | "default";
}) {
  const accentClass = {
    success: "text-success",
    destructive: "text-destructive",
    default: "text-foreground",
  }[accent];

  const Arrow = sign != null && sign > 0 ? ArrowDown : sign != null && sign < 0 ? ArrowUp : null;

  return (
    <div className="flex min-w-[6rem] flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("inline-flex items-center gap-1 font-heading text-base font-semibold tabular-nums", accentClass)}>
        {Arrow ? <Arrow className="size-3.5" /> : null}
        {value}
      </span>
    </div>
  );
}
