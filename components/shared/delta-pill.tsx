import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export type DeltaDirection = "up" | "down" | "flat";

const STYLES: Record<DeltaDirection, string> = {
  up: "text-success bg-success/10",
  down: "text-destructive bg-destructive/10",
  flat: "text-muted-foreground bg-muted",
};

const ICONS: Record<DeltaDirection, typeof ArrowUp> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};

/**
 * Small trend chip ("+8,4%", "−1,2 kg"). `direction` drives colour/icon only —
 * callers decide the semantics, so a weight drop can be a "down" pill that is
 * still good news for the user.
 */
export function DeltaPill({
  direction,
  children,
  className,
}: {
  direction: DeltaDirection;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = ICONS[direction];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
        STYLES[direction],
        className,
      )}
    >
      <Icon className="size-3" />
      {children}
    </span>
  );
}
