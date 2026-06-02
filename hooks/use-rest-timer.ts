"use client";

import { useMemo } from "react";

import { getExerciseById } from "@/data";
import {
  currentExercise,
  currentSet,
  loggingTarget,
  type ClockValues,
} from "@/lib/session-utils";
import { useActiveSessionStore } from "@/store";
import type { LoggedSet } from "@/types";

/**
 * Rest-countdown phases, ordered by urgency. Drives the ring colour, the ambient
 * glow and the header morph so every surface reacts to the same source of truth.
 *
 * - `calm`     >60% time left — relaxed neon green
 * - `prepare`  30–60%         — lime, "get ready"
 * - `tension`  10–30%         — orange, tension rising
 * - `urgent`   <10%           — red, urgency mode
 */
export type RestPhase = "calm" | "prepare" | "tension" | "urgent";

export interface RestPhaseTheme {
  phase: RestPhase;
  /** Base colour token used for stroke / text / glow. */
  color: string;
  /** Lighter gradient stop, for the ring's gradient sweep. */
  colorBright: string;
}

/**
 * Colours are CSS-variable backed so the timer always tracks the design tokens in
 * `globals.css` (success / primary / warning / destructive) instead of hardcoding
 * hex. `color-mix` only lightens the bright gradient stop.
 */
const PHASE_THEME: Record<RestPhase, RestPhaseTheme> = {
  calm: {
    phase: "calm",
    color: "var(--success)",
    colorBright: "color-mix(in oklch, var(--success), white 30%)",
  },
  prepare: {
    phase: "prepare",
    color: "var(--primary)",
    colorBright: "color-mix(in oklch, var(--primary), white 22%)",
  },
  tension: {
    phase: "tension",
    color: "var(--warning)",
    colorBright: "color-mix(in oklch, var(--warning), white 24%)",
  },
  urgent: {
    phase: "urgent",
    color: "var(--destructive)",
    colorBright: "color-mix(in oklch, var(--destructive), white 22%)",
  },
};

export function restPhaseFor(fractionRemaining: number): RestPhase {
  if (fractionRemaining > 0.6) return "calm";
  if (fractionRemaining > 0.3) return "prepare";
  if (fractionRemaining > 0.1) return "tension";
  return "urgent";
}

export function restPhaseTheme(fractionRemaining: number): RestPhaseTheme {
  return PHASE_THEME[restPhaseFor(fractionRemaining)];
}

export interface NextSetInfo {
  exerciseName: string | null;
  setNumber: number;
  totalSets: number;
  targetReps: string;
  targetWeightKg: number;
}

export interface RestTimerState {
  /** True while the session FSM is in `resting`. */
  active: boolean;
  /** True once the countdown has hit zero (rest is over, awaiting the next set). */
  restDone: boolean;
  remainingMs: number;
  remainingSec: number;
  totalMs: number;
  /** 0 → 1 share of rest still left — drives how much of the ring is drawn. */
  fractionRemaining: number;
  /** Last-5-seconds urgency window: pulse + heavier glow. */
  isFinalCountdown: boolean;
  theme: RestPhaseTheme;
  /** The upcoming set the user is about to perform. */
  next: NextSetInfo | null;
  /** The just-completed set, for capturing RPE / notes during the break. */
  logTarget: { exerciseIndex: number; set: LoggedSet } | null;
  restTargetSec: number;
  skip: () => void;
  addTime: (deltaSec: number) => void;
}

/**
 * Premium rest-timer view model. Reads the session FSM and derives every value the
 * rest UI needs from the shared `ClockValues` (so there is a SINGLE rAF loop — the
 * one in `useSessionClock`, owned by the view). Pure derivation; no timers here.
 */
export function useRestTimer(clock: ClockValues): RestTimerState {
  const session = useActiveSessionStore((s) => s.session);
  const skipRest = useActiveSessionStore((s) => s.skipRest);
  const setRestForCurrentSet = useActiveSessionStore(
    (s) => s.setRestForCurrentSet,
  );

  const active = session?.status === "resting";
  const totalMs = active ? session!.restTargetSec * 1000 : 0;
  const remainingMs = active ? clock.restRemainingMs : 0;
  const fractionRemaining =
    totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;

  const next = useMemo<NextSetInfo | null>(() => {
    if (!session || !active) return null;
    const ex = currentExercise(session);
    const set = currentSet(session);
    if (!ex || !set) return null;
    const meta = getExerciseById(ex.exerciseId);
    return {
      exerciseName: meta?.name ?? null,
      setNumber: set.setNumber,
      totalSets: ex.sets.length,
      targetReps: set.targetReps,
      targetWeightKg: set.targetWeightKg,
    };
  }, [session, active]);

  const logTarget = useMemo(
    () => (session && active ? loggingTarget(session) : null),
    [session, active],
  );

  const restDone = active && clock.restDone;
  const isFinalCountdown = active && !restDone && remainingMs <= 5000;

  return {
    active: !!active,
    restDone: !!restDone,
    remainingMs,
    remainingSec: Math.ceil(remainingMs / 1000),
    totalMs,
    fractionRemaining,
    isFinalCountdown: !!isFinalCountdown,
    theme: restPhaseTheme(fractionRemaining),
    next,
    logTarget,
    restTargetSec: active ? session!.restTargetSec : 0,
    skip: skipRest,
    addTime: (deltaSec) =>
      setRestForCurrentSet((session?.restTargetSec ?? 0) + deltaSec),
  };
}
