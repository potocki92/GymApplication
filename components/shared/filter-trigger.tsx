"use client";

import { SlidersHorizontal } from "lucide-react";

import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";

interface FilterTriggerProps {
  onClick: () => void;
  /** Number of filters currently narrowing the view. `0` hides the counter. */
  activeCount?: number;
  /** Overrides the default "Filtry" label. */
  label?: string;
  /** Optional control pinned to the right, e.g. a sort toggle. Not a link. */
  quickAction?: React.ReactNode;
  className?: string;
}

/**
 * The single entry point to filtering, anywhere in the app. It always looks the
 * same and always opens a `FilterSheet` from the bottom — never a popover, a
 * dropdown, or an inline filter bar.
 */
export function FilterTrigger({
  onClick,
  activeCount = 0,
  label,
  quickAction,
  className,
}: FilterTriggerProps) {
  const t = useDictionary();
  const text = label ?? t.common.filters;

  return (
    <div
      className={cn(
        "flex items-stretch gap-2 rounded-xl border border-border bg-card p-1",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors duration-fast hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{text}</span>
        {activeCount > 0 ? (
          <span
            aria-label={`${t.common.activeFilters}: ${activeCount}`}
            className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 font-numeric text-[0.6875rem] font-semibold tabular-nums text-primary-foreground"
          >
            {activeCount}
          </span>
        ) : null}
      </button>

      {quickAction ? (
        <div className="flex shrink-0 items-center border-l border-border pl-1">
          {quickAction}
        </div>
      ) : null}
    </div>
  );
}
