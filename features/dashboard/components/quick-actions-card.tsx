"use client";

import Link from "next/link";
import { Play, Scale, Watch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";

export function QuickActionsCard() {
  const t = useDictionary();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.dashboardWidgets.quickActionsTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button asChild variant="default" className="h-auto justify-start py-3">
          <Link href="/workout/active">
            <Play className="size-4" />
            {t.dashboardWidgets.quickStartWorkout}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start py-3">
          <Link href="/progress">
            <Scale className="size-4" />
            {t.dashboardWidgets.quickLogWeight}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start py-3" disabled>
          <Link href="/settings" aria-disabled>
            <Watch className="size-4" />
            {t.dashboardWidgets.quickConnectGarmin}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
