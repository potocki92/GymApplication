"use client";

import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";

type Tier = "success" | "primary" | "warning" | "destructive";

function tier(n: number): Tier {
  if (n <= 3) return "success";
  if (n <= 6) return "primary";
  if (n <= 8) return "warning";
  return "destructive";
}

const ACTIVE_CLASS: Record<Tier, string> = {
  success: "bg-success text-success-foreground border-success",
  primary: "bg-primary text-primary-foreground border-primary",
  warning: "bg-warning text-warning-foreground border-warning",
  destructive: "bg-destructive text-destructive-foreground border-destructive",
};

const IDLE_CLASS: Record<Tier, string> = {
  success: "bg-success/10 text-success",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export function RPESelector({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  label?: string;
}) {
  const t = useDictionary();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {label ?? t.activeWorkout.rpeHint}
        </span>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {value != null ? `${t.activeWorkout.rpe}: ${value}` : ""}
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value === n;
          const bucket = tier(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(active ? null : n)}
              aria-pressed={active}
              className={cn(
                "h-8 rounded-md border text-sm font-semibold tabular-nums transition-colors",
                active
                  ? ACTIVE_CLASS[bucket]
                  : `${IDLE_CLASS[bucket]} border-transparent`,
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
