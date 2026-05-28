import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Highlight the last word in the primary color. Defaults to "last". */
  accent?: "last" | false;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  accent = "last",
  className,
}: PageHeaderProps) {
  const parts = title.trim().split(/\s+/);
  const lead = accent === "last" ? parts.slice(0, -1).join(" ") : title;
  const accentWord = accent === "last" ? parts[parts.length - 1] : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-heading text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">
          {lead ? <span>{lead} </span> : null}
          {accentWord ? <span className="text-primary">{accentWord}</span> : null}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
