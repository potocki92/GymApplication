"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Dumbbell, Play } from "lucide-react";
import { useState } from "react";
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
import { buildSessionHistoryRecord } from "@/lib/session-history-utils";
import {
  useActiveSessionStore,
  useHistoryStore,
  usePlanStore,
  useSessionHistoryStore,
} from "@/store";
import { CurrentExercisePanel } from "./components/current-exercise-panel";
import { HeartRatePanel } from "./components/heart-rate-panel";
import { HeroTimer } from "./components/hero-timer";
import { RestPanel } from "./components/rest-panel";
import { SessionSummary } from "./components/session-summary";
import { SetLogger } from "./components/set-logger";
import { WorkoutActionBar } from "./components/workout-action-bar";
import { WorkoutHeader } from "./components/workout-header";

export function ActiveWorkoutView() {
  const t = useDictionary();
  const router = useRouter();
  const session = useActiveSessionStore((s) => s.session);
  const status = session?.status ?? "idle";

  const clock = useSessionClock();
  useSessionAutosave();
  useWakeLock(status === "executing" || status === "resting");
  useRestAlarm(clock.restDone, { sound: true, vibration: true });

  const [saving, setSaving] = useState(false);

  const exitToHome = () => {
    useActiveSessionStore.getState().abort();
    void clearSession();
    router.push("/");
  };

  const persistCompletion = async (meta: { rating?: number; note?: string }) => {
    const completed = useActiveSessionStore.getState().save();
    void clearSession();
    if (!completed) return;

    const completedWithMeta = { ...completed, ...meta };
    const records = completedSessionToHistoryRecords(completedWithMeta);
    const sessionRecord = buildSessionHistoryRecord(completedWithMeta);

    await Promise.all([
      records.length > 0
        ? useHistoryStore.getState().appendMany(records)
        : Promise.resolve(),
      useSessionHistoryStore.getState().upsert(sessionRecord),
    ]);
  };

  const handleSave = async (meta: { rating?: number; note?: string }) => {
    setSaving(true);
    try {
      await persistCompletion(meta);
      toast.success(t.activeWorkout.summary.saved);
      router.push("/");
    } catch (e) {
      console.error(e);
      toast.error(t.errors.unexpectedTitle);
    } finally {
      setSaving(false);
    }
  };

  const handleRepeat = async () => {
    if (!session) return;
    const workout = usePlanStore
      .getState()
      .plan.days.map((d) => d.workout)
      .find((w) => w != null && w.id === session.workoutId);
    if (!workout) {
      toast.error(t.errors.unexpectedTitle);
      return;
    }
    setSaving(true);
    try {
      // Save the current finished session before kicking off a fresh one — the
      // user explicitly asked to repeat, not to abandon results.
      await persistCompletion({});
      useActiveSessionStore.getState().start(workout);
    } catch (e) {
      console.error(e);
      toast.error(t.errors.unexpectedTitle);
    } finally {
      setSaving(false);
    }
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
        onSave={(meta) => void handleSave(meta)}
        onDiscard={exitToHome}
        onRepeat={() => void handleRepeat()}
        saving={saving}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col">
      <WorkoutHeader session={session} status={status} />

      <div className="space-y-4 pt-4 pb-4">
        <HeroTimer clock={clock} status={status} />

        <HeartRatePanel heartRate={session.heartRate} />

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
            {status === "resting" ? (
              <RestPanel session={session} clock={clock} />
            ) : (
              <SetLogger session={session} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <WorkoutActionBar
        status={status}
        session={session}
        onExit={exitToHome}
      />
    </div>
  );
}
