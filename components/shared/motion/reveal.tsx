"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Matches the DS `--ease-out-quint` token. */
const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;

interface RevealProps {
  children: React.ReactNode;
  /** Stagger index — each step adds 50ms of delay, like the mockup's `--i`. */
  index?: number;
  className?: string;
}

/**
 * Fade-and-rise wrapper used to stagger dashboard widgets into view. Replaces
 * the mockup's CSS `.reveal { animation-delay: calc(var(--i) * 50ms) }` with a
 * Framer variant that respects `prefers-reduced-motion` (renders static).
 */
export function Reveal({ children, index = 0, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.48,
        ease: EASE_OUT_QUINT,
        delay: index * 0.05,
      }}
    >
      {children}
    </motion.div>
  );
}
