"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";

import { AnimatedCounter } from "@/components/shared/animated-counter";
import { Card, CardContent } from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { buildPhotoStreak } from "@/lib/progress-photos/streak-utils";
import { cn } from "@/lib/utils";
import type { ProgressPhotoRecord } from "@/types";

interface StreakCardProps {
  records: ProgressPhotoRecord[];
}

export function StreakCard({ records }: StreakCardProps) {
  const t = useDictionary();
  const streak = useMemo(() => buildPhotoStreak(records), [records]);

  const message =
    streak.weeks === 0
      ? t.progressPhotos.streak.empty
      : streak.active
        ? t.progressPhotos.streak.active
        : t.progressPhotos.streak.inactive;

  return (
    <Card className={cn("ring-2", streak.active ? "ring-warning/40" : "ring-border")}>
      <CardContent className="flex items-center gap-4 py-1">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl",
            streak.active
              ? "bg-warning/15 text-warning"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Flame className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-1.5 font-heading text-2xl font-semibold leading-none tabular-nums">
            <AnimatedCounter value={streak.weeks} />
            <span className="text-sm font-medium text-muted-foreground">
              {t.progressPhotos.streak.label}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
