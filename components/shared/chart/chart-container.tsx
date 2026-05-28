import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";

interface ChartContainerProps {
  /** Tailwind height utility (e.g. "h-56", "h-72"). */
  heightClass?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  children: ReactElement;
}

/**
 * Responsive wrapper for recharts charts with a unified, fixed-height empty state
 * so the layout doesn't jump when there's no data.
 */
export function ChartContainer({
  heightClass = "h-56",
  isEmpty,
  emptyTitle,
  emptyDescription,
  className,
  children,
}: ChartContainerProps) {
  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-card/40 px-6 text-center",
          heightClass,
          className,
        )}
      >
        {emptyTitle ? (
          <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        ) : null}
        {emptyDescription ? (
          <p className="text-xs text-muted-foreground">{emptyDescription}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("w-full", heightClass, className)}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
