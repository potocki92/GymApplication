"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";

import { ExerciseIcon } from "@/components/shared/exercise-icon";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getExerciseById } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { topPRs } from "@/lib/pr-utils";
import { useHistoryStore } from "@/store";

export function TopPRsCard() {
  const t = useDictionary();
  const records = useHistoryStore((s) => s.records);
  const prs = topPRs(records, 5);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.prs.title}
        </CardTitle>
        <CardAction className="text-xs text-muted-foreground">
          <Link href="/exercises" className="hover:text-foreground">
            {t.prs.seeAll}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {prs.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border py-8 text-center">
            <Trophy className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium">{t.prs.empty}</p>
            <p className="text-xs text-muted-foreground">{t.prs.emptyHint}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {prs.map(({ exerciseId, bestRecord }, index) => {
              const ex = getExerciseById(exerciseId);
              if (!ex) return null;
              return (
                <li key={exerciseId}>
                  <Link
                    href={`/exercises/${ex.id}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40"
                  >
                    <span className="w-5 text-center font-heading text-xs font-semibold text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <ExerciseIcon
                      muscleGroup={ex.muscleGroup}
                      category={ex.category}
                      image={ex.image}
                      name={ex.name}
                      className="size-8"
                      iconClassName="size-4"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{ex.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {bestRecord.weightKg} {t.units.kg} × {bestRecord.reps}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {t.exercises.oneRM}
                      </p>
                      <p className="font-heading text-sm font-semibold tabular-nums">
                        {bestRecord.oneRMKg} {t.units.kg}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
