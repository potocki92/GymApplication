"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { Spinner } from "@/components/ui/spinner";
import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";

const DISMISS_OFFSET = 120;
const DISMISS_VELOCITY = 600;

interface AppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required for a11y — rendered as the Radix Dialog title. */
  title: string;
  description?: string;
  /** Body and (optionally) `AppSheetFooter`, in that order. */
  children: React.ReactNode;
  /** Max width on `sm+`. `default` 600px, `lg` 680px, `sm` 480px. */
  size?: "sm" | "default" | "lg";
  /**
   * Blocks every dismissal path (swipe, ESC, outside click) and hides the close
   * button. Use while work is in flight that must not be interrupted.
   */
  locked?: boolean;
  /** Covers the sheet with a spinner and implies `locked`. */
  loading?: boolean;
  /** Allow swipe-down to dismiss. Independent of ESC/outside click. */
  dismissOnDrag?: boolean;
  /** Applied to the panel. Use for height/padding tweaks, not for surface color. */
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<AppSheetProps["size"]>, string> = {
  sm: "sm:max-w-[480px]",
  default: "sm:max-w-[600px]",
  lg: "sm:max-w-[680px]",
};

/**
 * The one overlay primitive for working interactions: filters, forms, pickers,
 * settings, detail panels, action lists. Radix `Dialog` supplies focus-trap,
 * `aria-modal`, ESC, focus return and scroll-lock; Framer Motion supplies the
 * slide-up enter, swipe-to-dismiss and an interruptible exit.
 *
 * It is bottom-anchored at EVERY breakpoint on purpose. On desktop it stays
 * pinned to the bottom edge and caps its width instead of re-centering, so the
 * same interaction never changes its mental model between phone and laptop.
 *
 * Layout is three flex rows — header / body / footer — where ONLY the body
 * scrolls. The footer is a flex sibling (not `position: sticky`), so the action
 * bar stays visible regardless of body scroll height or the soft keyboard.
 *
 * See `docs/ui-system.md` for when to use this vs. `ConfirmDialog`.
 */
export function AppSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "default",
  locked = false,
  loading = false,
  dismissOnDrag = true,
  className,
}: AppSheetProps) {
  const t = useDictionary();
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();

  const isLocked = locked || loading;
  const canDrag = dismissOnDrag && !isLocked;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!canDrag) return;
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
      onOpenChange(false);
    }
  };

  const guard = (event: Event) => {
    if (isLocked) event.preventDefault();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                className="fixed inset-0 z-50 bg-black/70 supports-backdrop-filter:backdrop-blur-xs"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content
              asChild
              forceMount
              onPointerDownOutside={guard}
              onInteractOutside={guard}
              onEscapeKeyDown={guard}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 380, damping: 38 }
                }
                drag={canDrag ? "y" : false}
                dragListener={false}
                dragControls={controls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={handleDragEnd}
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-popover text-popover-foreground ring-1 ring-border outline-none",
                  // Same anchor on desktop — only the width is capped.
                  "sm:mx-auto",
                  SIZE_CLASS[size],
                  className,
                )}
              >
                {/* Header — drag origin. Starting the drag here (not on the body)
                    keeps the scroll region from fighting the dismiss gesture. */}
                <div
                  className="relative shrink-0 touch-none px-4 pt-2 pb-3"
                  onPointerDown={(e) => {
                    if (canDrag) controls.start(e);
                  }}
                >
                  {canDrag ? (
                    <div
                      aria-hidden
                      className="mx-auto mb-3 h-1 w-9 rounded-full bg-foreground/20"
                    />
                  ) : (
                    <div aria-hidden className="h-2" />
                  )}

                  <div className="flex items-start gap-3 pr-8">
                    <div className="min-w-0 flex-1">
                      <DialogPrimitive.Title className="font-heading text-base leading-snug font-semibold">
                        {title}
                      </DialogPrimitive.Title>
                      {description ? (
                        <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                          {description}
                        </DialogPrimitive.Description>
                      ) : (
                        <DialogPrimitive.Description className="sr-only">
                          {title}
                        </DialogPrimitive.Description>
                      )}
                    </div>
                  </div>

                  {!isLocked ? (
                    <DialogPrimitive.Close
                      className="absolute top-4 right-3 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      // The header is the drag handle; don't start a drag from the
                      // close button or the tap gets eaten by the gesture.
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <X className="size-4" />
                      <span className="sr-only">{t.common.close}</span>
                    </DialogPrimitive.Close>
                  ) : null}
                </div>

                {children}

                {loading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-popover/70">
                    <Spinner size="lg" className="text-muted-foreground" />
                  </div>
                ) : null}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

/** The only scrollable region of the sheet. */
function AppSheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-sheet-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-4",
        // When there is no footer the body owns the safe-area inset.
        "[&:last-child]:pb-[max(1rem,env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Action bar — always visible, safe-area aware. Primary action goes last in the
 * DOM so it lands on the right on `sm+` and on top when the row stacks.
 */
function AppSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-sheet-footer"
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-popover px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

const AppSheetClose = DialogPrimitive.Close;

export { AppSheetBody, AppSheetClose, AppSheetFooter };
