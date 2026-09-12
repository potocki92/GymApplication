"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional leading icon. Kept small — this control is label-first. */
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  /** Required for a11y — names the choice, e.g. "Zakres czasu". */
  "aria-label": string;
  size?: "sm" | "default";
  /** Stretch each segment to equal width. Defaults to `true`. */
  fullWidth?: boolean;
  className?: string;
}

const SIZE = {
  sm: { root: "h-9 p-0.5", item: "px-2.5 text-xs", gap: "gap-1.5", icon: "size-3.5" },
  default: { root: "h-11 p-1", item: "px-3 text-sm", gap: "gap-2", icon: "size-4" },
} as const;

/**
 * One-of-N view switcher: graphite track, near-white capsule on the selected
 * segment, muted labels elsewhere. Use it wherever the app currently reaches for
 * a local tab/toggle/button group. It is NOT navigation — moving between full
 * pages stays `Link` + the nav config.
 *
 * Semantics are a radiogroup with roving focus: arrows move and select, Home/End
 * jump to the ends, and the whole control is one tab stop.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = "default",
  fullWidth = true,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const reduceMotion = useReducedMotion();
  const layoutId = React.useId();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const s = SIZE[size];

  const selectable = options.filter((o) => !o.disabled);

  const move = (from: number, delta: number) => {
    if (selectable.length === 0) return;
    const order = options.map((o, i) => ({ o, i })).filter(({ o }) => !o.disabled);
    const pos = order.findIndex(({ i }) => i === from);
    const next = order[(pos + delta + order.length) % order.length];
    onValueChange(next.o.value);
    refs.current[next.i]?.focus();
  };

  const jump = (edge: "start" | "end") => {
    const target = edge === "start" ? selectable[0] : selectable[selectable.length - 1];
    if (!target) return;
    onValueChange(target.value);
    refs.current[options.indexOf(target)]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(index, -1);
        break;
      case "Home":
        event.preventDefault();
        jump("start");
        break;
      case "End":
        event.preventDefault();
        jump("end");
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-stretch rounded-full border border-border bg-surface-raised",
        s.root,
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            // Roving tabindex — the group is a single tab stop.
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative inline-flex min-w-0 flex-1 items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors duration-fast outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
              s.item,
              selected
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {selected ? (
              <motion.span
                aria-hidden
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-primary"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 520, damping: 42, mass: 0.7 }
                }
              />
            ) : null}
            <span className={cn("relative z-10 inline-flex items-center truncate", s.gap)}>
              {Icon ? <Icon className={s.icon} /> : null}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
