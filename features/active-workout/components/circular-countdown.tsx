"use client";

import { motion } from "framer-motion";
import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CircularCountdownProps {
  /** 0 → 1 share of the rest still remaining. 1 = full ring, 0 = empty. */
  fractionRemaining: number;
  /** Base colour token (CSS variable / colour string) for the stroke + glow. */
  color: string;
  /** Lighter gradient stop for the sweep. */
  colorBright: string;
  /** Render the centre (time + label). */
  children: ReactNode;
  /** Last-5s window — heavier glow + breathing scale. */
  isFinalCountdown?: boolean;
  reduceMotion?: boolean;
  className?: string;
}

const VIEWBOX = 200;
const STROKE = 12;
const RADIUS = (VIEWBOX - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const CENTER = VIEWBOX / 2;

/**
 * GPU-friendly circular countdown. The ring is a single SVG `circle` whose
 * `strokeDashoffset` is bound DIRECTLY to `fractionRemaining` (no CSS transition):
 * the parent recomputes that fraction every animation frame via the session clock,
 * so the sweep is a continuous 60fps depletion — every second is visible without
 * the stutter a stepped transition would add. A gradient stroke + colour-matched
 * `drop-shadow` give the outer glow; the glow filter reads the same colour token,
 * so it tracks the phase automatically.
 */
export function CircularCountdown({
  fractionRemaining,
  color,
  colorBright,
  children,
  isFinalCountdown = false,
  reduceMotion = false,
  className,
}: CircularCountdownProps) {
  // Strip colons — React's useId emits them, but they break SVG url(#…) refs.
  const gradientId = `rest-ring-${useId().replace(/:/g, "")}`;
  const offset = CIRC * (1 - Math.min(1, Math.max(0, fractionRemaining)));
  const glow = isFinalCountdown ? 22 : 12;

  return (
    <motion.div
      className={cn("relative aspect-square w-full", className)}
      style={{ willChange: "transform" }}
      animate={
        isFinalCountdown && !reduceMotion
          ? { scale: [1, 1.035, 1] }
          : { scale: 1 }
      }
      transition={
        isFinalCountdown && !reduceMotion
          ? { repeat: Infinity, duration: 1, ease: "easeInOut" }
          : { type: "spring", stiffness: 200, damping: 24 }
      }
    >
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="size-full -rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colorBright} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>

        {/* Track — the unfilled groove the ring depletes against. */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-white/[0.06]"
        />

        {/* Depleting progress ring. Direct bind = continuous 60fps sweep. */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 ${glow}px ${color})`,
            transition: "filter 300ms ease",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </motion.div>
  );
}
