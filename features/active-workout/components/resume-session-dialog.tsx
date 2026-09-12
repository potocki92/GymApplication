"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
    <ConfirmDialog
      open={open}
      // Closing by any route discards the recovered session — unchanged behaviour.
      onOpenChange={(next) => {
        if (!next) onDiscard();
      }}
      title={t.activeWorkout.resumeDialog.title}
      description={`${t.activeWorkout.resumeDialog.desc}${workoutName ? ` — ${workoutName}` : ""}`}
      cancelLabel={t.activeWorkout.resumeDialog.discard}
      confirmLabel={t.activeWorkout.resumeDialog.resume}
      destructive={false}
      onConfirm={onResume}
    />
  );
}
