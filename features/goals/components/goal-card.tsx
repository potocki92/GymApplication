"use client";

import type { ComponentType, ReactNode } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatNumber } from "@/lib/format";
import type { GoalProgress } from "@/lib/goals-utils";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  progress: GoalProgress;
  /** Jednostka pokazywana przy wartościach (np. "treningi", "kroki", "kg"). */
  unit?: string;
  /** Dodatkowe akcje w stopce (edycja/usuń lub link). */
  footer?: ReactNode;
  /** Liczba miejsc po przecinku dla wartości (waga = 1). */
  decimals?: number;
}

export function GoalCard({
  icon: Icon,
  title,
  progress,
  unit,
  footer,
  decimals = 0,
}: GoalCardProps) {
  const t = useDictionary();
  const fmt = (value: number) =>
    decimals > 0 ? value.toFixed(decimals) : formatNumber(value);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <Icon className="size-4" />
            {title}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
              progress.achieved
                ? "bg-success/15 text-success"
                : "bg-primary/15 text-primary",
            )}
          >
            {progress.achieved ? t.goals.status.achieved : `${progress.progressPct}%`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-heading text-2xl font-bold tabular-nums">
          {fmt(progress.current)}
          <span className="text-sm font-medium text-muted-foreground">
            {" / "}
            {fmt(progress.target)}
            {unit ? ` ${unit}` : ""}
          </span>
        </p>
        <Progress
          value={progress.progressPct}
          className={cn(
            "h-2",
            progress.achieved
              ? "[&>[data-slot=progress-indicator]]:bg-success"
              : "[&>[data-slot=progress-indicator]]:bg-primary",
          )}
        />
        {footer ? <div className="flex items-center gap-2 pt-1">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
