import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { WEEKDAY_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ActivityDay, ActivityLevel } from "@/types";

const HEAT_CLASSES: Record<ActivityLevel, string> = {
  0: "bg-heat-0",
  1: "bg-heat-1",
  2: "bg-heat-2",
  3: "bg-heat-3",
  4: "bg-heat-4",
};

const MONTHS_NOMINATIVE_PL = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

function chunkWeeks(days: ActivityDay[]): ActivityDay[][] {
  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function ActivityHeatmap({ activity }: { activity: ActivityDay[] }) {
  const t = useDictionary();
  const weeks = chunkWeeks(activity);

  const lastDate = activity.at(-1)?.date;
  const monthLabel = lastDate
    ? `${MONTHS_NOMINATIVE_PL[new Date(`${lastDate}T00:00:00Z`).getUTCMonth()]} ${new Date(`${lastDate}T00:00:00Z`).getUTCFullYear()}`
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
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          {/* weekday labels */}
          <div className="flex shrink-0 flex-col justify-between py-px text-[0.65rem] text-muted-foreground">
            {WEEKDAY_ORDER.map((wd) => (
              <span key={wd} className="leading-3">
                {t.weekdays.short[wd]}
              </span>
            ))}
          </div>

          {/* week columns */}
          <div className="no-scrollbar flex gap-1 overflow-x-auto pb-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => (
                  <span
                    key={day.date}
                    title={day.date}
                    className={cn("size-3 rounded-[3px]", HEAT_CLASSES[day.level])}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* legend */}
        <div className="flex items-center justify-end gap-1.5 text-[0.65rem] text-muted-foreground">
          <span>{t.dashboard.less}</span>
          {([0, 1, 2, 3, 4] as ActivityLevel[]).map((lvl) => (
            <span key={lvl} className={cn("size-3 rounded-[3px]", HEAT_CLASSES[lvl])} />
          ))}
          <span>{t.dashboard.more}</span>
        </div>
      </CardContent>
    </Card>
  );
}
