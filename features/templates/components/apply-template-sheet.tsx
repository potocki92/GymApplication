"use client";

import { AppSheet, AppSheetBody } from "@/components/ui/app-sheet";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { WEEKDAY_ORDER } from "@/lib/constants";
import type { Weekday, WorkoutTemplate } from "@/types";

export function ApplyTemplateSheet({
  template,
  onOpenChange,
  onPick,
}: {
  template: WorkoutTemplate | null;
  onOpenChange: (open: boolean) => void;
  onPick: (weekday: Weekday) => void;
}) {
  const t = useDictionary();

  return (
    <AppSheet
      open={template !== null}
      onOpenChange={onOpenChange}
      title={t.templates.applyToDay}
      description={template?.name}
      size="sm"
    >
      <AppSheetBody>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {WEEKDAY_ORDER.map((weekday) => (
            <Button
              key={weekday}
              variant="outline"
              onClick={() => onPick(weekday)}
            >
              {t.weekdays.full[weekday]}
            </Button>
          ))}
        </div>
      </AppSheetBody>
    </AppSheet>
  );
}
