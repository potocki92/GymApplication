"use client";

import Link from "next/link";

import { useActiveSessionTimer } from "@/hooks/use-active-session-timer";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Live workout timer shown in the app header while a session is in progress.
 * Renders nothing when no session is open. Clicking it returns to the active
 * workout screen.
 */
export function ActiveSessionTimer({ className }: { className?: string }) {
  const t = useDictionary();
  const { isActive, isPaused, totalMs } = useActiveSessionTimer();

  if (!isActive) return null;

  return (
    <Link
      href="/workout/active"
      aria-label={t.activeWorkout.returnToWorkout}
      title={t.activeWorkout.inProgress}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20",
        className,
      )}
    >
      <span className="relative flex size-2 shrink-0" aria-hidden="true">
        {!isPaused ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
        ) : null}
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      <span className="font-mono tabular-nums">{formatClock(totalMs)}</span>
    </Link>
  );
}
