import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatMinutes, formatVolume, formatWeekdayDatePL } from "@/lib/format";
import type { SessionHistoryRecord } from "@/types";

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-sm font-semibold">{value}</p>
    </div>
  );
}

export function LastWorkoutCard({
  session,
}: {
  session?: SessionHistoryRecord;
}) {
  const t = useDictionary();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.dashboard.lastWorkout}
        </CardTitle>
        {session ? (
          <CardAction className="text-xs text-muted-foreground">
            {formatWeekdayDatePL(
              new Date(session.finishedAt).toISOString().slice(0, 10),
            )}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {session ? (
          <>
            <p className="font-heading text-base font-semibold">
              {session.workoutName}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Meta
                label={t.dashboard.workoutMeta.exercises}
                value={String(session.exercisesCount)}
              />
              <Meta
                label={t.dashboard.workoutMeta.time}
                value={formatMinutes(Math.round(session.totalActiveMs / 60000))}
              />
              <Meta
                label={t.dashboard.workoutMeta.volume}
                value={formatVolume(session.totalVolumeKg)}
              />
            </div>
            <Button asChild variant="outline" className="mt-5 h-10 w-full">
              <Link href="/history">{t.common.seeDetails}</Link>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.dashboard.noLastWorkout}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
