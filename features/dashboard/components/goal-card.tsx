import Link from "next/link";
import { Target } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDictionary } from "@/hooks/use-dictionary";
import type { TrainingGoal } from "@/types";

export function GoalCard({ goal }: { goal: TrainingGoal }) {
  const t = useDictionary();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="size-4 text-primary" />
          {t.dashboard.goals}
        </CardTitle>
        <CardAction>
          <Link href="/settings" className="text-sm font-medium text-primary hover:underline">
            {t.common.edit}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-heading text-base font-semibold">{goal.title}</p>
        <div className="space-y-1.5">
          <Progress value={goal.progressPct} />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t.dashboard.goalDeadline} {goal.daysLeft} {t.dashboard.days}
            </span>
            <span className="font-semibold">{goal.progressPct}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
