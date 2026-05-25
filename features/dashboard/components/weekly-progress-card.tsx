import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/shared/progress-ring";
import { useDictionary } from "@/hooks/use-dictionary";

export function WeeklyProgressCard({
  done,
  target,
}: {
  done: number;
  target: number;
}) {
  const t = useDictionary();
  const value = target > 0 ? done / target : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.dashboard.weeklyProgress}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <ProgressRing value={value} size={84}>
          <span className="font-heading text-xl font-bold leading-none">{done}</span>
          <span className="text-xs text-muted-foreground">/ {target}</span>
        </ProgressRing>
        <div>
          <p className="font-heading text-3xl font-bold leading-none">
            {done}
            <span className="text-muted-foreground"> / {target}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.workoutsUnit}</p>
        </div>
      </CardContent>
    </Card>
  );
}
