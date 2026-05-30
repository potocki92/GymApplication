"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required for a11y — rendered as the Radix Dialog title. */
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Disable swipe-down / outside dismissal (e.g. while an upload is running). */
  dismissOnDrag?: boolean;
}

const DISMISS_OFFSET = 120;
const DISMISS_VELOCITY = 600;

/**
 * Mobile-first bottom sheet: Radix `Dialog` supplies focus-trap, `aria-modal`,
 * ESC, focus return and scroll-lock; Framer Motion supplies the slide-up enter,
 * the swipe-down-to-dismiss gesture and an interruptible exit. On `sm+` it
 * re-centers to read like a regular dialog.
 *
 * Layout is three flex rows — header / body / footer — where ONLY the body
 * scrolls. The footer is a flex sibling (not `position: sticky`), so the
 * action bar stays visible regardless of body scroll height or the soft
 * keyboard.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  dismissOnDrag = true,
}: BottomSheetProps) {
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!dismissOnDrag) return;
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
      onOpenChange(false);
    }
  };

  const guard = (event: Event) => {
    if (!dismissOnDrag) event.preventDefault();
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
                className="fixed inset-0 z-50 bg-black/60 supports-backdrop-filter:backdrop-blur-xs"
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
                drag={dismissOnDrag ? "y" : false}
                dragListener={false}
                dragControls={controls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={handleDragEnd}
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 flex max-h-[100dvh] flex-col overflow-hidden rounded-t-4xl bg-card text-card-foreground ring-1 ring-border outline-none",
                  "h-[100dvh] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85dvh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-4xl",
                  className,
                )}
              >
                {/* Header — drag origin. Starting the drag here (not on the body)
                    keeps the scroll region from fighting the dismiss gesture. */}
                <div
                  className="shrink-0 touch-none px-4 pb-2 pt-2"
                  onPointerDown={(e) => {
                    if (dismissOnDrag) controls.start(e);
                  }}
                >
                  <div
                    aria-hidden
                    className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border sm:hidden"
                  />
                  <DialogPrimitive.Title className="font-heading text-base leading-none font-medium">
                    {title}
                  </DialogPrimitive.Title>
                  {description ? (
                    <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
                      {description}
                    </DialogPrimitive.Description>
                  ) : (
                    <DialogPrimitive.Description className="sr-only">
                      {title}
                    </DialogPrimitive.Description>
                  )}
                </div>

                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

/** The only scrollable region of the sheet. */
function BottomSheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-sheet-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

/** Sticky action bar — always visible, safe-area aware. */
function BottomSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-sheet-footer"
      className={cn(
        "shrink-0 flex flex-col-reverse gap-2 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export { BottomSheetBody, BottomSheetFooter };
