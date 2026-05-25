import { Flame } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";

export function StreakCard({ days }: { days: number }) {
  const t = useDictionary();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.dashboard.streak}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="font-heading text-3xl font-bold leading-none">
            {days}{" "}
            <span className="text-base font-medium text-muted-foreground">
              {t.dashboard.days}
            </span>
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{t.dashboard.streakSub}</p>
        </div>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
          <Flame className="size-6" />
        </span>
      </CardContent>
    </Card>
  );
}
