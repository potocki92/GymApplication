import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-10 text-center",
        className,
      )}
    >
      <Spinner size="lg" className="text-muted-foreground" label={label ?? "Ładowanie"} />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}
