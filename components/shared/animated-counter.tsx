"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Count-up number. Honours `prefers-reduced-motion` (snaps to the final value)
 * and re-runs whenever `value` changes. The state write happens inside Framer's
 * async `onUpdate` callback, not synchronously in the effect body.
 */
export function AnimatedCounter({
  value,
  decimals = 0,
  durationMs = 900,
  prefix = "",
  suffix = "",
  className,
}: AnimatedCounterProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Always drive the value through Framer's async `onUpdate` (duration 0 when
    // reduced motion) so we never call setState synchronously in the effect body.
    const controls = animate(display, value, {
      duration: reduceMotion ? 0 : durationMs / 1000,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion]);

  const formatted = display.toLocaleString("pl-PL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
