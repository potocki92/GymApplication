"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDictionary } from "@/hooks/use-dictionary";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Defaults to `common.delete` for destructive intent, `common.save` otherwise. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in red. Defaults to `true`. */
  destructive?: boolean;
  /**
   * Confirming does NOT close the dialog on its own — close it from here. That
   * keeps callers whose dismissal has its own meaning (discarding a recovered
   * session, for instance) from firing both paths on one click.
   */
  onConfirm: () => void;
}

/**
 * The ONLY sanctioned centered dialog for product interactions, and only for
 * short destructive confirmations ("Usunąć trening?"). Anything with fields,
 * options or more than one decision belongs in `AppSheet` — see
 * `docs/ui-system.md`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useDictionary();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {cancelLabel ?? t.common.cancel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel ?? (destructive ? t.common.delete : t.common.save)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
