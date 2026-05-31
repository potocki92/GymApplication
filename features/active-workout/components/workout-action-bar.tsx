"use client";

import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  MoreVertical,
  Pause,
  Play,
  SkipForward,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";
import { useActiveSessionStore } from "@/store";
import type { ActiveSession, SessionStatus } from "@/types";
import { AddExerciseSheet } from "./add-exercise-sheet";
import { SessionControls } from "./session-controls";

function canSkipExercise(session: ActiveSession): boolean {
  // Has a next exercise with at least one set.
  for (let e = session.currentExerciseIndex + 1; e < session.exercises.length; e += 1) {
    if (session.exercises[e].sets.length > 0) return true;
  }
  return false;
}

function fireHapticTap(): void {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    navigator.vibrate(15);
  }
}

export function WorkoutActionBar({
  status,
  session,
  onExit,
}: {
  status: SessionStatus;
  session: ActiveSession;
  onExit: () => void;
}) {
  const t = useDictionary();
  const completeSet = useActiveSessionStore((s) => s.completeSet);
  const skipRest = useActiveSessionStore((s) => s.skipRest);
  const skipToNextExercise = useActiveSessionStore(
    (s) => s.skipToNextExercise,
  );
  const resume = useActiveSessionStore((s) => s.resume);
  const undo = useActiveSessionStore((s) => s.undo);

  const [menuOpen, setMenuOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const showSkip = canSkipExercise(session);
  const canShowSkipNow = status === "executing" || status === "resting";

  const handleCompleteSet = () => {
    if (celebrating) return;
    fireHapticTap();
    setCelebrating(true);
    window.setTimeout(() => {
      completeSet();
      toast.success(t.activeWorkout.setCompletedToast);
      setCelebrating(false);
    }, 220);
  };

  const handleSkipRest = () => {
    fireHapticTap();
    skipRest();
  };

  const handleResume = () => {
    fireHapticTap();
    resume();
  };

  const handleSkipExercise = () => {
    fireHapticTap();
    skipToNextExercise();
    toast(t.activeWorkout.nextExerciseSkippedToast, {
      duration: 5000,
      action: {
        label: t.activeWorkout.nextExerciseUndo,
        onClick: () => undo(),
      },
    });
  };

  const closeMenu = () => setMenuOpen(false);

  let primary: React.ReactNode;
  if (status === "paused") {
    primary = (
      <Button
        type="button"
        className="h-14 flex-1 text-base"
        onClick={handleResume}
      >
        <Play className="size-5" />
        {t.activeWorkout.resume}
      </Button>
    );
  } else if (status === "resting") {
    primary = (
      <Button
        type="button"
        className="h-14 flex-1 text-base"
        onClick={handleSkipRest}
      >
        <ChevronRight className="size-5" />
        {t.activeWorkout.nextSet}
      </Button>
    );
  } else {
    primary = (
      <Button
        type="button"
        className={cn(
          "h-14 flex-1 text-base",
          celebrating && "pointer-events-none",
        )}
        onClick={handleCompleteSet}
        disabled={celebrating}
        aria-label={t.activeWorkout.completeSet}
      >
        <motion.span
          animate={celebrating ? { scale: [1, 1.35, 1] } : { scale: 1 }}
          transition={{ duration: 0.22 }}
          className="inline-flex items-center gap-1.5"
        >
          <Check className="size-5" />
          {t.activeWorkout.completeSet}
        </motion.span>
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div className="flex items-center gap-2">
        {primary}
        {showSkip && canShowSkipNow ? (
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="h-14 w-14 shrink-0"
            onClick={handleSkipExercise}
            aria-label={t.activeWorkout.nextExercise}
            title={t.activeWorkout.nextExercise}
          >
            <SkipForward className="size-5" />
          </Button>
        ) : null}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="h-14 w-14 shrink-0"
              aria-label={t.activeWorkout.menuLabel}
            >
              <MoreVertical className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>{t.activeWorkout.overflowMenuTitle}</SheetTitle>
            </SheetHeader>
            <div className="space-y-3 px-4 pb-6">
              <AddExerciseSheet session={session} onAdded={closeMenu} />
              <SessionControls
                status={status}
                onExit={() => {
                  closeMenu();
                  onExit();
                }}
                onAfterAction={closeMenu}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      {status === "paused" ? (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Pause className="size-3" />
          {t.activeWorkout.paused}
        </p>
      ) : null}
    </div>
  );
}
