"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { useDictionary } from "@/hooks/use-dictionary";
import { useProgressPhotosStore } from "@/store";
import type { MilestoneKind } from "@/lib/progress-photos/streak-utils";

const DISMISS_MS = 2400;
const PARTICLE_COLORS = ["var(--color-primary)", "var(--color-accent)", "var(--color-info)"];

/**
 * Brief, full-screen reward shown when an upload crosses a count milestone.
 * Reads the pending milestone from the store and auto-dismisses. Particles are
 * pure Framer Motion — no confetti dependency.
 */
export function CelebrationOverlay() {
  const t = useDictionary();
  const celebrate = useProgressPhotosStore((s) => s.celebrate);
  const dismiss = useProgressPhotosStore((s) => s.dismissCelebration);
  const reduceMotion = useReducedMotion();

  // Deterministic radial burst (pure — no Math.random in render).
  const particles = useMemo(() => {
    const count = 18;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const dist = 150 + (i % 5) * 28;
      return {
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 40,
        rotate: ((i * 53) % 360) - 180,
        delay: (i % 6) * 0.03,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      };
    });
  }, []);

  useEffect(() => {
    if (!celebrate) return;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([12, 40, 12]);
    }
    const id = window.setTimeout(dismiss, DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [celebrate, dismiss]);

  const message = celebrate
    ? t.progressPhotos.celebration[celebrate.kind as Exclude<MilestoneKind, "firstComparison">]
    : "";

  return (
    <AnimatePresence>
      {celebrate ? (
        <motion.div
          key="celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={dismiss}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="relative flex flex-col items-center">
            {/* Particle burst */}
            {!reduceMotion ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {particles.map((p) => (
                  <motion.span
                    key={p.id}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rotate, scale: 0.4 }}
                    transition={{ duration: 1.1, delay: p.delay, ease: "easeOut" }}
                    style={{ backgroundColor: p.color }}
                    className="absolute size-2.5 rounded-[2px]"
                  />
                ))}
              </div>
            ) : null}

            <motion.div
              initial={{ scale: reduceMotion ? 1 : 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className="flex flex-col items-center gap-3 rounded-3xl bg-card px-8 py-7 text-center shadow-[0_0_60px_-12px] shadow-primary/50 ring-1 ring-primary/30"
            >
              <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Sparkles className="size-8" />
              </span>
              <p className="max-w-[16rem] font-heading text-lg font-semibold leading-tight">
                {message}
              </p>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
