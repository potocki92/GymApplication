import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  current: number;
  total: number;
  label?: string;
}

export function OnboardingProgress({
  current,
  total,
  label,
}: OnboardingProgressProps) {
  const pct = Math.min(100, Math.max(0, ((current + 1) / total) * 100));
  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full bg-primary transition-all")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
