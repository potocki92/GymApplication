import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface ListRowProps {
  /** Renders the row as a `Link`. Mutually exclusive with `onClick`. */
  href?: string;
  onClick?: () => void;
  /** Thumbnail, avatar or icon chip on the left. */
  leading?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Badge row under the title. */
  meta?: React.ReactNode;
  /** Value or control on the right, before the chevron. */
  trailing?: React.ReactNode;
  /** Defaults to `true` for rows that navigate. */
  chevron?: boolean;
  className?: string;
}

/**
 * The standard row on a card surface: a thumbnail, a title with optional badges,
 * and something on the right. Used for exercise lists, history entries, settings
 * and the nav "Więcej" sheet, so rows stop being re-invented per feature.
 *
 * Static rows are visually inert; only rows that navigate or act get the hover
 * and focus treatment.
 */
export function ListRow({
  href,
  onClick,
  leading,
  title,
  description,
  meta,
  trailing,
  chevron,
  className,
}: ListRowProps) {
  const interactive = Boolean(href || onClick);
  const showChevron = chevron ?? Boolean(href);

  const content = (
    <>
      {leading ? <span className="shrink-0">{leading}</span> : null}

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-1 text-sm font-medium text-foreground">
          {title}
        </span>
        {meta ? (
          <span className="flex flex-wrap items-center gap-1.5">{meta}</span>
        ) : null}
        {description ? (
          <span className="line-clamp-1 text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>

      {trailing ? (
        <span className="shrink-0 text-right text-sm tabular-nums">{trailing}</span>
      ) : null}
      {showChevron ? (
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  );

  const classes = cn(
    "flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left",
    interactive &&
      "transition-colors duration-fast hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}
