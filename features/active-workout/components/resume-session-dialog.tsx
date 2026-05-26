"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDictionary } from "@/hooks/use-dictionary";

export function ResumeSessionDialog({
  open,
  workoutName,
  onResume,
  onDiscard,
}: {
  open: boolean;
  workoutName?: string;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const t = useDictionary();
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onDiscard() : undefined)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.activeWorkout.resumeDialog.title}</DialogTitle>
          <DialogDescription>
            {t.activeWorkout.resumeDialog.desc}
            {workoutName ? ` — ${workoutName}` : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onDiscard}>
            {t.activeWorkout.resumeDialog.discard}
          </Button>
          <Button onClick={onResume}>{t.activeWorkout.resumeDialog.resume}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
