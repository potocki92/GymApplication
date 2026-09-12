import { AnimatedCounter } from "@/components/shared/animated-counter";
import { cn } from "@/lib/utils";

type StatTone = "default" | "data" | "muted" | "warning" | "destructive";

const TONE: Record<StatTone, string> = {
  default: "text-foreground",
  data: "text-data",
  muted: "text-muted-foreground",
  warning: "text-warning",
  destructive: "text-destructive",
};

const SIZE = {
  sm: "text-xl",
  default: "text-2xl",
  lg: "text-3xl",
} as const;

interface StatValueProps {
  /** Numbers get tabular alignment and can count up; strings render as-is. */
  value: number | string;
  unit?: string;
  decimals?: number;
  /** Count up on mount. Ignored for string values. */
  animate?: boolean;
  tone?: StatTone;
  size?: keyof typeof SIZE;
  className?: string;
}

/**
 * The one way to render a metric. Keeps every number in the app on the same
 * face, weight and tabular alignment so columns of stats line up.
 */
export function StatValue({
  value,
  unit,
  decimals = 0,
  animate = false,
  tone = "default",
  size = "default",
  className,
}: StatValueProps) {
  return (
    <p
      className={cn(
        "font-numeric leading-none font-semibold tracking-tight tabular-nums",
        SIZE[size],
        TONE[tone],
        className,
      )}
    >
      {typeof value === "number" && animate ? (
        <AnimatedCounter value={value} decimals={decimals} />
      ) : (
        value
      )}
      {unit ? (
        <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>
      ) : null}
    </p>
  );
}
