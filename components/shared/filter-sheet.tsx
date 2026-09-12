"use client";

import {
  AppSheet,
  AppSheetBody,
  AppSheetFooter,
} from "@/components/ui/app-sheet";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Defaults to "Filtry". */
  title?: string;
  description?: string;
  /** Clears every filter back to its default. Disabled when nothing is active. */
  onReset: () => void;
  /**
   * Runs when the user confirms. Filters that apply live can omit this — the
   * sheet just closes, which is what "Zastosuj" means for a live view.
   */
  onApply?: () => void;
  /** Drives the reset button's disabled state. */
  activeCount?: number;
  children: React.ReactNode;
}

/**
 * A `FormSheet`-shaped wrapper around `AppSheet` for filtering. Every filter
 * surface in the app uses it, so Reset and Zastosuj are always in the same
 * corner and the body always scrolls the same way.
 *
 * Compose the body out of `FilterSection` + the shared controls
 * (`SegmentedControl`, `ToggleChip`, `Input`), not bespoke markup.
 */
export function FilterSheet({
  open,
  onOpenChange,
  title,
  description,
  onReset,
  onApply,
  activeCount = 0,
  children,
}: FilterSheetProps) {
  const t = useDictionary();

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? t.common.filters}
      description={description}
    >
      <AppSheetBody className="flex flex-col gap-6 py-2">{children}</AppSheetBody>
      {/* One row at every width: Reset sits beside Zastosuj rather than stacking
          under it, where a full-width ghost button reads like a second CTA. */}
      <AppSheetFooter className="flex-row items-center gap-3">
        <Button
          variant="ghost"
          onClick={onReset}
          disabled={activeCount === 0}
          className="shrink-0"
        >
          {t.common.reset}
        </Button>
        <Button
          onClick={() => {
            onApply?.();
            onOpenChange(false);
          }}
          className="flex-1"
        >
          {t.common.apply}
        </Button>
      </AppSheetFooter>
    </AppSheet>
  );
}

/** One labelled group inside a `FilterSheet`. */
export function FilterSection({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2.5", className)}>
      <SectionLabel>{label}</SectionLabel>
      {/* A horizontal chip row bleeds to the sheet edges instead of clipping a
          chip mid-word against the body's padding. */}
      <div className="[&>[role=group]]:-mx-4 [&>[role=group]]:px-4">
        {children}
      </div>
    </section>
  );
}
