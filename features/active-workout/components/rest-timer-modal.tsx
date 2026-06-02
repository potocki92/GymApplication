"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Play, Plus, SkipForward } from "lucide-react";
import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/hooks/use-dictionary";
import { useRestTimer } from "@/hooks/use-rest-timer";
import { formatClock } from "@/lib/format";
import type { ClockValues } from "@/lib/session-utils";
import { cn } from "@/lib/utils";
import { useActiveSessionStore } from "@/store";
import type { LoggedSet } from "@/types";
import { CircularCountdown } from "./circular-countdown";
import { RPESelector } from "./rpe-selector";

/** Compact "how did the set go" capture, bound to the just-completed set. */
function RestSetFeedback({
  target,
  exerciseIndex,
}: {
  target: LoggedSet;
  exerciseIndex: number;
}) {
  const t = useDictionary();
  const editSet = useActiveSessionStore((s) => s.editSet);
  const [notesLocal, setNotesLocal] = useState(target.notes ?? "");

  return (
    <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
      <RPESelector
        value={target.rpe}
        onChange={(v) => editSet(exerciseIndex, target.id, { rpe: v })}
        label={t.activeWorkout.restMode.howWasSet.replace(
          "{n}",
          String(target.setNumber),
        )}
      />
      <div className="space-y-1.5">
        <Label
          htmlFor={`rest-modal-notes-${target.id}`}
          className="text-xs text-muted-foreground"
        >
          {t.activeWorkout.notesFor.replace("{n}", String(target.setNumber))}
        </Label>
        <Input
          id={`rest-modal-notes-${target.id}`}
          value={notesLocal}
          onChange={(e) => setNotesLocal(e.target.value)}
          onBlur={() => {
            if (notesLocal !== (target.notes ?? "")) {
              editSet(exerciseIndex, target.id, { notes: notesLocal });
            }
          }}
          placeholder={t.activeWorkout.notesPlaceholder}
          className="border-white/10 bg-white/[0.04]"
        />
      </div>
    </div>
  );
}

/** Glassmorphism ±time control with a tactile tap response. */
function AdjustButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex h-14 w-20 flex-col items-center justify-center gap-0.5 rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold tabular-nums backdrop-blur-md transition-colors active:bg-white/[0.12]"
    >
      {icon}
      <span className="text-xs">{label}</span>
    </motion.button>
  );
}

interface RestTimerModalProps {
  clock: ClockValues;
}

/**
 * Fullscreen, cinematic rest-mode overlay. Opens whenever the session FSM enters
 * `resting`; closing is driven entirely by the store (skip / countdown → next set),
 * so the modal can't be dismissed into an inconsistent state. Radix `Dialog`
 * supplies focus-trap / scroll-lock / a11y; Framer Motion supplies the scale-in
 * entrance and the interruptible exit.
 */
export function RestTimerModal({ clock }: RestTimerModalProps) {
  const t = useDictionary();
  const rest = useRestTimer(clock);
  const reduceMotion = useReducedMotion();
  const tr = t.activeWorkout.restMode;

  const open = rest.active;
  const { theme } = rest;

  const guard = (event: Event) => event.preventDefault();

  return (
    <DialogPrimitive.Root open={open}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            {/* Scrim — dims, blurs and desaturates the workout behind. */}
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
                className="fixed inset-0 z-50 bg-background/70 supports-backdrop-filter:bg-background/40 supports-backdrop-filter:backdrop-blur-2xl supports-backdrop-filter:backdrop-saturate-[0.7]"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content
              asChild
              forceMount
              onEscapeKeyDown={guard}
              onPointerDownOutside={guard}
              onInteractOutside={guard}
              aria-describedby={undefined}
            >
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={
                  reduceMotion
                    ? { duration: 0.15 }
                    : { type: "spring", stiffness: 260, damping: 26, mass: 0.9 }
                }
                className="fixed inset-0 z-50 overflow-hidden outline-none"
                style={{ willChange: "transform, opacity" }}
              >
                <DialogPrimitive.Title className="sr-only">
                  {tr.badge}
                </DialogPrimitive.Title>

                {/* Ambient breathing glow — tracks the phase colour. */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[40%] size-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                  style={{
                    background: `radial-gradient(circle, ${theme.color} 0%, transparent 60%)`,
                  }}
                  animate={
                    reduceMotion
                      ? { opacity: 0.14 }
                      : { opacity: [0.1, 0.2, 0.1], scale: [1, 1.06, 1] }
                  }
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { repeat: Infinity, duration: 6, ease: "easeInOut" }
                  }
                />
                {/* Vignette to focus the eye on the dial. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(120% 100% at 50% 32%, transparent 38%, rgba(0,0,0,0.55) 100%)",
                  }}
                />

                <div className="relative flex h-full flex-col items-center overflow-y-auto px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  {/* TOP STATUS — pulsing neon badge */}
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduceMotion ? 0 : 0.1, duration: 0.3 }}
                    className="shrink-0"
                  >
                    <span
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-[0.2em] uppercase"
                      style={{
                        color: theme.color,
                        borderColor: `color-mix(in oklch, ${theme.color}, transparent 60%)`,
                        backgroundColor: `color-mix(in oklch, ${theme.color}, transparent 90%)`,
                        boxShadow: `0 0 20px color-mix(in oklch, ${theme.color}, transparent 70%)`,
                      }}
                    >
                      <motion.span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: theme.color }}
                        animate={
                          reduceMotion ? { opacity: 1 } : { opacity: [1, 0.3, 1] }
                        }
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { repeat: Infinity, duration: 1.8, ease: "easeInOut" }
                        }
                      />
                      {tr.badge}
                    </span>
                  </motion.div>

                  {/* MAIN TIMER — centred hero */}
                  <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 py-6">
                    <p className="text-sm font-medium tracking-wide text-muted-foreground">
                      {rest.restDone ? tr.doneHeadline : tr.runningHeadline}
                    </p>

                    <CircularCountdown
                      fractionRemaining={rest.fractionRemaining}
                      color={theme.color}
                      colorBright={theme.colorBright}
                      isFinalCountdown={rest.isFinalCountdown}
                      reduceMotion={!!reduceMotion}
                      className="max-w-[min(72vw,300px)]"
                    >
                      <motion.span
                        className="font-heading text-6xl font-bold tabular-nums sm:text-7xl"
                        style={{ color: rest.restDone ? theme.color : undefined }}
                        animate={
                          rest.isFinalCountdown && !reduceMotion
                            ? { scale: [1, 1.06, 1] }
                            : { scale: 1 }
                        }
                        transition={
                          rest.isFinalCountdown && !reduceMotion
                            ? { repeat: Infinity, duration: 1, ease: "easeInOut" }
                            : { duration: 0.2 }
                        }
                      >
                        {formatClock(rest.remainingMs)}
                      </motion.span>
                      <span className="mt-1 text-xs tracking-wide text-muted-foreground">
                        {tr.toNextSet}
                      </span>
                    </CircularCountdown>

                    {/* NEXT-UP card */}
                    {rest.next ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduceMotion ? 0 : 0.18, duration: 0.3 }}
                        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-md"
                      >
                        <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                          {tr.nextUp}
                        </p>
                        <p className="mt-0.5 line-clamp-1 font-heading text-base font-semibold">
                          {rest.next.exerciseName ?? t.activeWorkout.exercise}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                          {tr.seriesLabel.replace(
                            "{n}",
                            String(rest.next.setNumber),
                          )}
                          <span className="mx-1.5">·</span>
                          {tr.reps.replace("{reps}", rest.next.targetReps)}
                          {rest.next.targetWeightKg > 0 ? (
                            <>
                              <span className="mx-1.5">·</span>
                              {rest.next.targetWeightKg} {t.units.kg}
                            </>
                          ) : null}
                        </p>
                      </motion.div>
                    ) : null}

                    {rest.logTarget ? (
                      <RestSetFeedback
                        key={rest.logTarget.set.id}
                        target={rest.logTarget.set}
                        exerciseIndex={rest.logTarget.exerciseIndex}
                      />
                    ) : null}
                  </div>

                  {/* BOTTOM ACTIONS */}
                  <div className="flex w-full max-w-sm shrink-0 items-center justify-center gap-3 pt-2">
                    <AdjustButton
                      label={tr.sub15}
                      icon={<Minus className="size-4" />}
                      onClick={() => rest.addTime(-15)}
                    />

                    <motion.button
                      type="button"
                      onClick={rest.skip}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={cn(
                        "flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground",
                        "shadow-[0_0_24px_color-mix(in_oklch,var(--primary),transparent_55%)] active:shadow-[0_0_12px_color-mix(in_oklch,var(--primary),transparent_70%)]",
                      )}
                    >
                      {rest.restDone ? (
                        <>
                          <Play className="size-5" />
                          {tr.startNextSet}
                        </>
                      ) : (
                        <>
                          <SkipForward className="size-5" />
                          {tr.skip}
                        </>
                      )}
                    </motion.button>

                    <AdjustButton
                      label={tr.add15}
                      icon={<Plus className="size-4" />}
                      onClick={() => rest.addTime(15)}
                    />
                  </div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
