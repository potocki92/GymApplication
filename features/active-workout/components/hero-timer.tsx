"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Timer } from "lucide-react";

import { useDictionary } from "@/hooks/use-dictionary";
import { useRestTimer } from "@/hooks/use-rest-timer";
import { formatClock } from "@/lib/format";
import type { ClockValues } from "@/lib/session-utils";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/types";

/**
 * Workout header timer that intelligently swaps modes. During normal training it
 * shows total workout duration; the instant the session enters `resting` it morphs
 * into a live rest countdown — colour, glow and border all react to the rest phase
 * — then morphs back when the break ends. The morph is an `AnimatePresence` swap so
 * it reads as the app "switching into rest mode", not just a number changing.
 */
export function HeroTimer({
  clock,
  status,
}: {
  clock: ClockValues;
  status: SessionStatus;
}) {
  const t = useDictionary();
  const reduceMotion = useReducedMotion();
  const rest = useRestTimer(clock);
  const showSetTimer = status === "executing" && clock.setMs > 0;

  const restMode = rest.active;
  const accent = rest.theme.color;

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl px-4 py-4"
      animate={{
        backgroundColor: restMode
          ? "color-mix(in oklch, var(--card), transparent 15%)"
          : "var(--card)",
        // Border + outer glow rendered as boxShadow so it can tint per-phase.
        boxShadow: restMode
          ? `inset 0 0 0 1px color-mix(in oklch, ${accent}, transparent 55%), 0 0 24px color-mix(in oklch, ${accent}, transparent 80%)`
          : "inset 0 0 0 1px color-mix(in oklch, var(--foreground), transparent 90%)",
      }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
    >
      {/* Phase-tinted wash that breathes while resting. */}
      <AnimatePresence>
        {restMode ? (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={
              reduceMotion ? { opacity: 0.12 } : { opacity: [0.08, 0.16, 0.08] }
            }
            exit={{ opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.2 }
                : { repeat: Infinity, duration: 3, ease: "easeInOut" }
            }
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(120% 140% at 85% 50%, ${accent} 0%, transparent 60%)`,
            }}
          />
        ) : null}
      </AnimatePresence>

      <div className="relative flex items-center justify-between gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {restMode ? (
            <motion.div
              key="rest"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="space-y-0.5"
            >
              <p
                className="inline-flex items-center gap-1.5 text-[0.7rem] font-bold tracking-[0.15em] uppercase"
                style={{ color: accent }}
              >
                <motion.span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: accent }}
                  animate={
                    reduceMotion ? { opacity: 1 } : { opacity: [1, 0.3, 1] }
                  }
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { repeat: Infinity, duration: 1.6, ease: "easeInOut" }
                  }
                />
                {t.activeWorkout.restMode.badge}
              </p>
              <motion.p
                className="font-heading text-4xl font-bold tabular-nums sm:text-5xl"
                style={{ color: accent }}
                animate={
                  rest.isFinalCountdown && !reduceMotion
                    ? { scale: [1, 1.04, 1] }
                    : { scale: 1 }
                }
                transition={
                  rest.isFinalCountdown && !reduceMotion
                    ? { repeat: Infinity, duration: 1, ease: "easeInOut" }
                    : { duration: 0.2 }
                }
              >
                {formatClock(rest.remainingMs)}
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="total"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="space-y-0.5"
            >
              <p className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                <Timer className="size-3.5" />
                {t.activeWorkout.totalTimer}
              </p>
              <p
                className={cn(
                  "font-heading text-4xl font-bold tabular-nums sm:text-5xl",
                  status === "paused" && "text-muted-foreground",
                )}
              >
                {formatClock(clock.totalMs)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {showSetTimer ? (
          <div className="relative text-right">
            <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
              {t.activeWorkout.setTimer}
            </p>
            <p className="font-heading text-xl font-semibold tabular-nums text-primary">
              {formatClock(clock.setMs)}
            </p>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
