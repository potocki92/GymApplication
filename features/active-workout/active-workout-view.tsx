"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dumbbell, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getExerciseById } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { useHrZones } from "@/hooks/use-hr-zones";
import { useLiveHeartRate } from "@/hooks/use-live-heart-rate";
import { useRestAlarm } from "@/hooks/use-rest-alarm";
import { useSessionAutosave } from "@/hooks/use-session-autosave";
import { useSessionClock } from "@/hooks/use-session-clock";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { completedSessionToHistoryRecords } from "@/lib/history-utils";
import { clearSession } from "@/lib/idb-session";
import { setProgress } from "@/lib/session-utils";
import { buildSessionHistoryRecord } from "@/lib/session-history-utils";
import {
  selectHeartRateAggregate,
  selectHeartRateChartData,
  useActiveSessionStore,
  useHeartRateStore,
  useHistoryStore,
  usePlanStore,
  useSessionHistoryStore,
} from "@/store";
import { CurrentExercisePanel } from "./components/current-exercise-panel";
import { HeartRatePanel } from "./components/heart-rate-panel";
import { HeroTimer } from "./components/hero-timer";
import { HighHrAlertBanner } from "./components/high-hr-alert-banner";
import {
  HrZoneLegend,
  LiveHeartRateChart,
} from "./components/live-heart-rate-chart";
import { RestTimerModal } from "./components/rest-timer-modal";
import { SessionSummary } from "./components/session-summary";
import { SetLogger } from "./components/set-logger";
import { WorkoutActionBar } from "./components/workout-action-bar";
import { WorkoutHeader } from "./components/workout-header";

const LIVE_HR_ENABLED = process.env.NEXT_PUBLIC_HR_LIVE === "1";

export function ActiveWorkoutView() {
  const t = useDictionary();
  const router = useRouter();
  const session = useActiveSessionStore((s) => s.session);
  const status = session?.status ?? "idle";

  const clock = useSessionClock();
  useSessionAutosave();
  useWakeLock(status === "executing" || status === "resting");
  useRestAlarm(clock.restDone, { sound: true, vibration: true });

  // Derive zone bounds from profile (kept in sync with `useHeartRateStore`).
  const zones = useHrZones();
  // Wire transport ↔ store while a session is in flight. The hook is a no-op
  // when `LIVE_HR_ENABLED` is false, so prod stays dark until Etap 6.
  useLiveHeartRate(LIVE_HR_ENABLED && session != null ? session.id : null, {
    enabled: LIVE_HR_ENABLED,
  });

  const liveHeartRate = useHeartRateStore(
    useShallow((s) => ({
      currentBpm: s.currentBpm ?? undefined,
      avgBpm: s.avgBpm ?? undefined,
      maxBpm: s.maxBpm ?? undefined,
      currentZone: s.currentZone ?? undefined,
      samples: s.samples,
      source: s.device?.vendor ?? null,
    })),
  );
  const liveChartSamples = useHeartRateStore(
    useShallow((s) => selectHeartRateChartData(s, 300)),
  );
  const liveConnectionState = useHeartRateStore((s) => s.connectionState);
  const liveDevice = useHeartRateStore((s) => s.device);

  const liveSnapshot = useMemo(
    () => ({ ...liveHeartRate }),
    [liveHeartRate],
  );

  // Prefer the streaming snapshot once any sample has landed; otherwise fall
  // back to whatever was already attached to the session.
  const displayedHr = LIVE_HR_ENABLED
    ? liveSnapshot.currentBpm != null
      ? liveSnapshot
      : session?.heartRate
    : session?.heartRate;

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

    // Fold the live HR aggregate into the completed session. When the realtime
    // layer is off (no samples ingested), this no-ops to the session's own HR.
    const hrAggregate = selectHeartRateAggregate(useHeartRateStore.getState());
    const completedWithHr =
      hrAggregate.currentBpm != null || hrAggregate.samples?.length
        ? { ...completed, heartRate: hrAggregate }
        : completed;

    const completedWithMeta = { ...completedWithHr, ...meta };
    const records = completedSessionToHistoryRecords(completedWithMeta);
    const sessionRecord = buildSessionHistoryRecord(completedWithMeta);

    await Promise.all([
      records.length > 0
        ? useHistoryStore.getState().appendMany(records)
        : Promise.resolve(),
      useSessionHistoryStore.getState().upsert(sessionRecord),
    ]);

    await usePlanStore.getState().setWorkoutCompleted(completed.workoutId, true);
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
      await useActiveSessionStore.getState().startWorkoutSession(workout);
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

        {LIVE_HR_ENABLED ? <HighHrAlertBanner /> : null}

        <HeartRatePanel
          heartRate={displayedHr}
          compact={!LIVE_HR_ENABLED}
          zones={zones}
          connectionState={LIVE_HR_ENABLED ? liveConnectionState : undefined}
          device={LIVE_HR_ENABLED ? liveDevice : undefined}
        />

        {LIVE_HR_ENABLED ? (
          <div className="space-y-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
            <LiveHeartRateChart samples={liveChartSamples} zones={zones} />
            <HrZoneLegend
              zones={zones}
              activeZone={liveSnapshot.currentZone ?? null}
            />
          </div>
        ) : null}

        {/* Live workout surface. During `resting` this stays mounted as the
            ambient backdrop behind the fullscreen rest overlay. */}
        <div className="space-y-4">
          <CurrentExercisePanel session={session} />
          <SetLogger session={session} />
        </div>
      </div>

      <WorkoutActionBar
        status={status}
        session={session}
        onExit={exitToHome}
      />

      {/* Fullscreen REST MODE — opens itself whenever status === "resting". */}
      <RestTimerModal clock={clock} />
    </div>
  );
}
