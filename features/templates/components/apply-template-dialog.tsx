"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDictionary } from "@/hooks/use-dictionary";
import { WEEKDAY_ORDER } from "@/lib/constants";
import type { Weekday, WorkoutTemplate } from "@/types";

export function ApplyTemplateDialog({
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
    <Dialog open={template !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.templates.applyToDay}</DialogTitle>
          <DialogDescription>
            {template ? template.name : ""}
          </DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
