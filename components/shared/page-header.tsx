import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Small uppercase label above the title — e.g. the section this page is in. */
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * The single page title block. Hierarchy is eyebrow → title → description, with
 * weight and spacing doing the work instead of size and color: the title is a
 * plain white semibold line, never uppercase and never with a colored word.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <SectionLabel className="mb-2">{eyebrow}</SectionLabel> : null}
        <h1 className="font-heading text-[1.375rem] leading-tight font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
