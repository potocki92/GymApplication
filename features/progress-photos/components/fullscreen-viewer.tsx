"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatLongDate } from "@/lib/progress-photos/format";
import { useProgressPhotosStore } from "@/store";
import type { ProgressPhotoRecord } from "@/types";

import { EditPhotoSheet } from "./edit-photo-sheet";
import { ViewerSlide } from "./viewer-slide";

interface FullscreenViewerProps {
  photos: ProgressPhotoRecord[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function FullscreenViewer({
  photos,
  index,
  onIndexChange,
  onClose,
}: FullscreenViewerProps) {
  const t = useDictionary();
  const remove = useProgressPhotosStore((s) => s.remove);
  const [zoomed, setZoomed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // Only the originally-opened photo carries the shared-element `layoutId` morph
  // from its gallery card; once the user paginates there is no source element.
  const [navigated, setNavigated] = useState(false);

  const open = index != null && index >= 0 && index < photos.length;
  const record = open ? photos[index] : null;

  const triggerEl = useRef<Element | null>(null);
  // Ref-only bookkeeping (no state writes) — capture the element that opened us.
  useEffect(() => {
    if (open && triggerEl.current === null) {
      triggerEl.current = document.activeElement;
    } else if (!open) {
      triggerEl.current = null;
    }
  }, [open]);

  const close = () => {
    setZoomed(false);
    setEditOpen(false);
    setNavigated(false);
    if (triggerEl.current instanceof HTMLElement) triggerEl.current.focus();
    onClose();
  };

  const paginate = (dir: 1 | -1) => {
    if (index == null) return;
    const next = index + dir;
    if (next >= 0 && next < photos.length) {
      setZoomed(false);
      setNavigated(true);
      onIndexChange(next);
    }
  };

  useEffect(() => {
    if (!open || editOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") paginate(-1);
      else if (e.key === "ArrowRight") paginate(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editOpen, index, photos.length]);

  const handleDelete = () => {
    if (!record) return;
    const target = record;
    toast(t.progressPhotos.card.confirmDelete, {
      action: {
        label: t.progressPhotos.card.delete,
        onClick: async () => {
          try {
            await remove(target.id);
            toast.success(t.progressPhotos.card.deleted);
            close();
          } catch {
            toast.error(t.progressPhotos.errors.generic);
          }
        },
      },
    });
  };

  const counter =
    index != null
      ? t.progressPhotos.fullscreen.counter
          .replace("{current}", String(index + 1))
          .replace("{total}", String(photos.length))
      : "";

  return (
    <AnimatePresence>
      {open && record ? (
        <motion.div
          key="fs-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label={`${formatLongDate(record.takenAt, t.progressPhotos.months)} · ${t.progressPhotos.poses[record.pose]}`}
        >
          {/* Header chrome */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold">
                {formatLongDate(record.takenAt, t.progressPhotos.months)}
              </p>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {t.progressPhotos.poses[record.pose]}
              </Badge>
              {record.weightKg != null ? (
                <Badge variant="outline" className="text-[11px] font-semibold">
                  {record.weightKg.toFixed(1)} kg
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs tabular-nums text-muted-foreground">
                {counter}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditOpen(true)}
                aria-label={t.progressPhotos.edit.action}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                aria-label={t.progressPhotos.card.delete}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={close}
                aria-label={t.progressPhotos.fullscreen.close}
                autoFocus
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>

          {/* Photo stage */}
          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={record.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 p-2"
              >
                <ViewerSlide
                  record={record}
                  withLayoutId={!navigated}
                  onClose={close}
                  onPaginate={paginate}
                  canPrev={index! > 0}
                  canNext={index! < photos.length - 1}
                  onZoomChange={setZoomed}
                />
              </motion.div>
            </AnimatePresence>

            {/* Desktop / a11y nav arrows — hidden while zoomed to avoid blocking pan. */}
            {!zoomed && index! > 0 ? (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => paginate(-1)}
                aria-label={t.progressPhotos.fullscreen.previous}
                className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full opacity-80 sm:flex"
              >
                <ChevronLeft className="size-5" />
              </Button>
            ) : null}
            {!zoomed && index! < photos.length - 1 ? (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => paginate(1)}
                aria-label={t.progressPhotos.fullscreen.next}
                className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full opacity-80 sm:flex"
              >
                <ChevronRight className="size-5" />
              </Button>
            ) : null}
          </div>

          {record.notes ? (
            <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
              {record.notes}
            </div>
          ) : null}

          <EditPhotoSheet
            record={record}
            open={editOpen}
            onOpenChange={setEditOpen}
            // A pose/date change can move the record out of the current pose
            // filter — close instead of pointing at a shifted index.
            onSaved={(poseChanged) => {
              if (poseChanged) close();
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
