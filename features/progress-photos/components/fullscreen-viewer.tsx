"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import { useProgressPhotosStore } from "@/store";
import type { ProgressPhotoRecord } from "@/types";

interface FullscreenViewerProps {
  record: ProgressPhotoRecord | null;
  onClose: () => void;
}

function formatLong(iso: string, monthNames: readonly string[]): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${monthNames[m - 1]?.toLowerCase() ?? ""} ${y}`;
}

export function FullscreenViewer({ record, onClose }: FullscreenViewerProps) {
  const t = useDictionary();
  const remove = useProgressPhotosStore((s) => s.remove);
  const { url } = useSignedUrl(record?.storagePath ?? null);

  useEffect(() => {
    if (!record) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [record, onClose]);

  const handleDelete = async () => {
    if (!record) return;
    if (!window.confirm(t.progressPhotos.card.confirmDelete)) return;
    try {
      await remove(record.id);
      toast.success(t.progressPhotos.card.deleted);
      onClose();
    } catch {
      toast.error(t.progressPhotos.errors.generic);
    }
  };

  return (
    <AnimatePresence>
      {record ? (
        <motion.div
          key="fs-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {formatLong(record.takenAt, t.progressPhotos.months)} ·{" "}
                {t.progressPhotos.poses[record.pose]}
              </p>
              {record.weightKg != null ? (
                <p className="text-xs text-muted-foreground">
                  {record.weightKg.toFixed(1)} kg
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
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
                onClick={onClose}
                aria-label={t.progressPhotos.fullscreen.close}
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>

          <motion.div
            layoutId={`photo-${record.id}`}
            className="relative flex flex-1 items-center justify-center overflow-hidden p-2"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.y) > 120) onClose();
            }}
            style={{ touchAction: "pinch-zoom" }}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={record.notes ?? record.takenAt}
                className="max-h-full max-w-full select-none object-contain"
                draggable={false}
              />
            ) : (
              <div className="size-full animate-pulse rounded-lg bg-muted" />
            )}
          </motion.div>

          {record.notes ? (
            <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
              {record.notes}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
