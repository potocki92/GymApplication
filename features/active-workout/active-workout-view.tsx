"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Dumbbell, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getExerciseById } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { useRestAlarm } from "@/hooks/use-rest-alarm";
import { useSessionAutosave } from "@/hooks/use-session-autosave";
import { useSessionClock } from "@/hooks/use-session-clock";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { completedSessionToHistoryRecords } from "@/lib/history-utils";
import { clearSession } from "@/lib/idb-session";
import { setProgress } from "@/lib/session-utils";
import { useActiveSessionStore, useHistoryStore } from "@/store";
import { CurrentExercisePanel } from "./components/current-exercise-panel";
import { SessionControls } from "./components/session-controls";
import { SessionSummary } from "./components/session-summary";
import { SetLogger } from "./components/set-logger";
import { WorkoutTimers } from "./components/workout-timers";

export function ActiveWorkoutView() {
  const t = useDictionary();
  const router = useRouter();
  const session = useActiveSessionStore((s) => s.session);
  const status = session?.status ?? "idle";

  const clock = useSessionClock();
  useSessionAutosave();
  useWakeLock(status === "executing" || status === "resting");
  useRestAlarm(clock.restDone, { sound: true, vibration: true });

  const exitToHome = () => {
    useActiveSessionStore.getState().abort();
    void clearSession();
    router.push("/");
  };

  const handleSave = () => {
    const completed = useActiveSessionStore.getState().save();
    void clearSession();
    if (completed) {
      const records = completedSessionToHistoryRecords(completed);
      if (records.length > 0) {
        void useHistoryStore.getState().appendMany(records);
      }
    }
    toast.success(t.activeWorkout.summary.saved);
    router.push("/");
  };

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <Dumbbell className="size-8 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-heading text-lg font-semibold">
            {t.activeWorkout.emptyTitle}
          </p>
          <p className="text-sm text-muted-foreground">
            {t.activeWorkout.emptyDesc}
          </p>
        </div>
        <Button asChild>
          <Link href="/plan">{t.activeWorkout.goToPlan}</Link>
        </Button>
      </div>
    );
  }

  if (status === "planning") {
    const progress = setProgress(session);
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div className="space-y-1 text-center">
          <p className="text-sm text-muted-foreground">{t.activeWorkout.ready}</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {session.workoutName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {session.exercises.length} {t.plan.exercises.toLowerCase()} ·{" "}
            {progress.total} {t.units.series}
          </p>
        </div>

        <div className="space-y-2">
          {session.exercises.map((ex) => {
            const meta = getExerciseById(ex.exerciseId);
            return (
              <div
                key={ex.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
              >
                <span className="line-clamp-1 text-sm font-medium">
                  {meta?.name ?? t.activeWorkout.exercise}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {ex.sets.length} × {ex.targetReps}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={exitToHome}>
            {t.activeWorkout.exit}
          </Button>
          <Button
            className="h-12 flex-[2] text-base"
            onClick={() => useActiveSessionStore.getState().beginFirstSet()}
          >
            <Play className="size-5" />
            {t.activeWorkout.start}
          </Button>
        </div>
      </div>
    );
  }

  if (status === "finished") {
    return (
      <SessionSummary
        session={session}
        onSave={handleSave}
        onDiscard={exitToHome}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="text-center">
        <h1 className="font-heading text-lg font-bold tracking-tight">
          {session.workoutName}
        </h1>
        {status === "paused" ? (
          <p className="text-sm font-medium text-primary">
            {t.activeWorkout.paused}
          </p>
        ) : null}
      </div>

      <WorkoutTimers clock={clock} status={status} />

      <AnimatePresence mode="wait">
        <motion.div
          key={status === "resting" ? "resting" : "executing"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="space-y-4"
        >
          <CurrentExercisePanel session={session} />
          <SetLogger session={session} />
        </motion.div>
      </AnimatePresence>

      <SessionControls status={status} onExit={exitToHome} />
    </div>
  );
}
