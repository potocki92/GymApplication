"use client";

import { useState } from "react";
import { Flag, LogOut, Pause, Play, Redo2, Undo2 } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { useActiveSessionStore } from "@/store";
import type { SessionStatus } from "@/types";

export function SessionControls({
  status,
  onExit,
  onAfterAction,
}: {
  status: SessionStatus;
  onExit: () => void;
  onAfterAction?: () => void;
}) {
  const t = useDictionary();
  const pause = useActiveSessionStore((s) => s.pause);
  const resume = useActiveSessionStore((s) => s.resume);
  const finishEarly = useActiveSessionStore((s) => s.finishEarly);
  const undo = useActiveSessionStore((s) => s.undo);
  const redo = useActiveSessionStore((s) => s.redo);
  const canUndo = useActiveSessionStore((s) => s.past.length > 0);
  const canRedo = useActiveSessionStore((s) => s.future.length > 0);

  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const isPaused = status === "paused";

  const wrap = (fn: () => void) => () => {
    fn();
    onAfterAction?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isPaused ? (
          <Button
            className="h-11 flex-1 text-base"
            onClick={wrap(() => resume())}
          >
            <Play className="size-5" />
            {t.activeWorkout.resume}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-11 flex-1 text-base"
            onClick={wrap(() => pause())}
            disabled={status !== "executing" && status !== "resting"}
          >
            <Pause className="size-5" />
            {t.activeWorkout.pause}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t.activeWorkout.undo}
          onClick={wrap(() => undo())}
          disabled={!canUndo}
        >
          <Undo2 className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t.activeWorkout.redo}
          onClick={wrap(() => redo())}
          disabled={!canRedo}
        >
          <Redo2 className="size-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => setConfirmExit(true)}
        >
          <LogOut className="size-4" />
          {t.activeWorkout.exit}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="flex-1"
          onClick={() => setConfirmFinish(true)}
        >
          <Flag className="size-4" />
          {t.activeWorkout.finish}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title={t.activeWorkout.finishConfirmTitle}
        description={t.activeWorkout.finishConfirmDesc}
        confirmLabel={t.activeWorkout.finish}
        onConfirm={() => {
          setConfirmFinish(false);
          finishEarly();
          onAfterAction?.();
        }}
      />

      <ConfirmDialog
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title={t.activeWorkout.exitConfirmTitle}
        description={t.activeWorkout.exitConfirmDesc}
        confirmLabel={t.activeWorkout.exit}
        onConfirm={() => {
          setConfirmExit(false);
          onExit();
        }}
      />
    </div>
  );
}
