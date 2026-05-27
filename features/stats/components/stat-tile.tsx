import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  accent = "default",
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
}) {
  const accentClass: Record<typeof accent, string> = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl bg-card ring-1 ring-foreground/10 p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "font-heading text-2xl font-bold leading-tight tabular-nums",
          accentClass[accent],
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="text-xs text-muted-foreground tabular-nums">{hint}</div>
      ) : null}
    </div>
  );
}
