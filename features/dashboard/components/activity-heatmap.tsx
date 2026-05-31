import { ActivityHeatmapGrid } from "@/components/shared/activity-heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatMonthYearPL } from "@/lib/format";
import type { ActivityDay } from "@/types";

export function ActivityHeatmap({ activity }: { activity: ActivityDay[] }) {
  const t = useDictionary();

  const lastDate = activity.at(-1)?.date;
  const lastAsDate = lastDate ? new Date(`${lastDate}T00:00:00Z`) : null;
  const monthLabel = lastAsDate
    ? formatMonthYearPL(lastAsDate.getUTCFullYear(), lastAsDate.getUTCMonth())
    : "";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.dashboard.activity}
        </CardTitle>
        <span className="col-start-2 row-span-2 self-start justify-self-end text-sm font-medium text-muted-foreground">
          {monthLabel}
        </span>
      </CardHeader>
      <CardContent>
        <ActivityHeatmapGrid activity={activity} />
      </CardContent>
    </Card>
  );
}
