"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Dumbbell,
  Footprints,
  Pencil,
  Plus,
  Scale,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { computeWeightGoalProgress, goalProgress } from "@/lib/goals-utils";
import { buildWeightSummary } from "@/lib/stats-utils";
import {
  useGoalsStore,
  useMetricsStore,
  useProfileStore,
  useSessionHistoryStore,
  useStepsStore,
} from "@/store";
import type { Goal, GoalType } from "@/types";
import { GoalCard } from "./components/goal-card";
import { GoalFormDialog } from "./components/goal-form-dialog";

const GOAL_ICON: Record<GoalType, typeof Dumbbell> = {
  workouts_weekly: Dumbbell,
  steps_daily: Footprints,
  steps_weekly: Footprints,
};

export function GoalsView() {
  const t = useDictionary();
  const goals = useGoalsStore((s) => s.goals);
  const upsertGoal = useGoalsStore((s) => s.upsert);
  const removeGoal = useGoalsStore((s) => s.remove);

  const sessions = useSessionHistoryStore((s) => s.sessions);
  const daily = useStepsStore((s) => s.daily);
  const metrics = useMetricsStore((s) => s.records);
  const metricGoal = useMetricsStore((s) => s.goal);
  const profile = useProfileStore((s) => s.profile);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const now = useMemo(() => new Date(), []);
  const ctx = useMemo(() => ({ sessions, daily }), [sessions, daily]);

  const weightSummary = useMemo(
    () =>
      buildWeightSummary(
        metrics,
        metricGoal,
        profile?.currentWeightKg ?? null,
        profile?.targetWeightKg ?? null,
      ),
    [metrics, metricGoal, profile?.currentWeightKg, profile?.targetWeightKg],
  );
  const hasWeightGoal = weightSummary.targetKg != null;

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => a.createdAt - b.createdAt),
    [goals],
  );

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setFormOpen(true);
  };

  const handleDelete = (goal: Goal) => {
    void removeGoal(goal.id);
    toast.success(t.goals.deleted);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.goals.title}
        description={t.goals.subtitle}
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" />
            {t.goals.addGoal}
          </Button>
        }
      />

      {sortedGoals.length === 0 && !hasWeightGoal ? (
        <EmptyState
          icon={Dumbbell}
          title={t.goals.empty}
          description={t.goals.emptyHint}
          action={
            <Button onClick={openNew}>
              <Plus className="size-4" />
              {t.goals.addGoal}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              icon={GOAL_ICON[goal.type]}
              title={t.goals.types[goal.type]}
              progress={goalProgress(goal, ctx, now)}
              unit={t.goals.unit[goal.type]}
              footer={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(goal)}
                  >
                    <Pencil className="size-4" />
                    {t.common.edit}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={t.goals.deleteGoal}
                    title={t.goals.deleteGoal}
                    onClick={() => handleDelete(goal)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              }
            />
          ))}

          {hasWeightGoal ? (
            <GoalCard
              icon={Scale}
              title={t.goals.types.weight}
              progress={computeWeightGoalProgress(weightSummary)}
              unit={t.units.kg}
              decimals={1}
              footer={
                <Button asChild variant="outline" size="sm">
                  <Link href="/progress">{t.goals.weightGoalCta}</Link>
                </Button>
              }
            />
          ) : null}
        </div>
      )}

      <GoalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={({ type, target }) => {
          void upsertGoal({ type, target });
          toast.success(t.goals.saved);
        }}
      />
    </div>
  );
}
