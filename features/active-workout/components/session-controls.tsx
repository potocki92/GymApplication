"use client";

import { useState } from "react";
import { Flag, LogOut, Pause, Play, Redo2, Undo2 } from "lucide-react";

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
import { useActiveSessionStore } from "@/store";
import type { SessionStatus } from "@/types";

export function SessionControls({
  status,
  onExit,
}: {
  status: SessionStatus;
  onExit: () => void;
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isPaused ? (
          <Button className="h-11 flex-1 text-base" onClick={() => resume()}>
            <Play className="size-5" />
            {t.activeWorkout.resume}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-11 flex-1 text-base"
            onClick={() => pause()}
          >
            <Pause className="size-5" />
            {t.activeWorkout.pause}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t.activeWorkout.undo}
          onClick={() => undo()}
          disabled={!canUndo}
        >
          <Undo2 className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t.activeWorkout.redo}
          onClick={() => redo()}
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

      <Dialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.activeWorkout.finishConfirmTitle}</DialogTitle>
            <DialogDescription>
              {t.activeWorkout.finishConfirmDesc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmFinish(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmFinish(false);
                finishEarly();
              }}
            >
              {t.activeWorkout.finish}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.activeWorkout.exitConfirmTitle}</DialogTitle>
            <DialogDescription>{t.activeWorkout.exitConfirmDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExit(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmExit(false);
                onExit();
              }}
            >
              {t.activeWorkout.exit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
