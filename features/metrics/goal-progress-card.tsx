"use client";

import { useState } from "react";
import { Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDictionary } from "@/hooks/use-dictionary";
import { latestForMetric, progressTier, progressToGoalPct } from "@/lib/metrics-utils";
import { cn } from "@/lib/utils";
import { useMetricsStore } from "@/store";
import { GoalEditorDialog } from "./goal-editor-dialog";

export function GoalProgressCard() {
  const t = useDictionary();
  const goal = useMetricsStore((s) => s.goal);
  const records = useMetricsStore((s) => s.records);
  const setGoal = useMetricsStore((s) => s.setGoal);
  const [open, setOpen] = useState(false);

  const latest = latestForMetric(records, "weightKg");
  const currentKg = latest?.weightKg ?? goal?.startKg ?? 0;
  const pct = goal ? progressToGoalPct(goal.startKg, currentKg, goal.targetKg) : 0;
  const tier = progressTier(pct);

  const tierColor: Record<string, string> = {
    ahead: "bg-success/15 text-success",
    "on-track": "bg-primary/15 text-primary",
    behind: "bg-destructive/15 text-destructive",
  };
  const tierIndicator: Record<string, string> = {
    ahead: "[&>[data-slot=progress-indicator]]:bg-success",
    "on-track": "[&>[data-slot=progress-indicator]]:bg-primary",
    behind: "[&>[data-slot=progress-indicator]]:bg-destructive",
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="size-4" />
          {t.metrics.goalSection.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goal ? (
          <>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="font-heading text-2xl font-bold tabular-nums">
                  {currentKg} {t.units.kg}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {goal.startKg} → {goal.targetKg} {t.units.kg}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                  tierColor[tier],
                )}
              >
                {pct}%
              </span>
            </div>
            <Progress value={pct} className={cn("h-2", tierIndicator[tier])} />
            <div className="flex items-center justify-between gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                {t.metrics.goalSection.editGoal}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void setGoal(null);
                }}
                aria-label={t.metrics.goalSection.removeGoal}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t.metrics.goalSection.noGoal}
            </p>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Target className="size-4" />
              {t.metrics.goalSection.setGoal}
            </Button>
          </>
        )}
      </CardContent>

      <GoalEditorDialog
        open={open}
        onOpenChange={setOpen}
        initial={goal}
        onSubmit={(g) => {
          void setGoal(g);
          toast.success(t.metrics.goalSection.saved);
        }}
      />
    </Card>
  );
}
