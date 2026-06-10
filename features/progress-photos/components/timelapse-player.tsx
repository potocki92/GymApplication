"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, RotateCcw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatLongDate } from "@/lib/progress-photos/format";
import { prefetchSignedUrls } from "@/lib/progress-photos/use-signed-url";
import type { ProgressPhotoRecord } from "@/types";

interface TimelapsePlayerProps {
  /** Photos of the active pose (any order). */
  photos: ProgressPhotoRecord[];
  open: boolean;
  onClose: () => void;
}

type TimelapseSpeed = 0.5 | 1 | 2;

const SPEEDS: TimelapseSpeed[] = [0.5, 1, 2];

/**
 * Chronological slideshow of the pose's photos — a "transformation movie".
 * Signed URLs are batch-prefetched on open and the next frames are decoded
 * ahead of playback to avoid flicker.
 */
export function TimelapsePlayer({ photos, open, onClose }: TimelapsePlayerProps) {
  const t = useDictionary();

  const ascending = useMemo(
    () => [...photos].sort((a, b) => (a.takenAt < b.takenAt ? -1 : 1)),
    [photos],
  );

  const [urls, setUrls] = useState<Map<string, string> | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<TimelapseSpeed>(1);

  // Render-time reset on open (no effect → no stale-frame flash).
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFrame(0);
      setPlaying(false);
      setUrls(null);
    }
  }

  // Batch-sign URLs each time the player opens; autostart when they arrive.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void prefetchSignedUrls(ascending.map((p) => p.storagePath)).then((map) => {
      if (cancelled) return;
      setUrls(map);
      setPlaying(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, ascending]);

  // Rolling preload: decode the current and next two frames ahead of time.
  useEffect(() => {
    if (!open || !urls) return;
    for (let i = frame; i < Math.min(frame + 3, ascending.length); i += 1) {
      const url = urls.get(ascending[i].storagePath);
      if (!url) continue;
      const img = new Image();
      img.src = url;
      void img.decode().catch(() => {});
    }
  }, [open, urls, frame, ascending]);

  const atEnd = frame >= ascending.length - 1;

  // Advance the frame while playing; the last frame simply stops scheduling.
  useEffect(() => {
    if (!open || !playing || !urls || frame >= ascending.length - 1) return;
    const id = setTimeout(() => setFrame((f) => f + 1), speed * 1000);
    return () => clearTimeout(id);
  }, [open, playing, urls, frame, speed, ascending.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const record = ascending[frame] ?? null;
  const url = record && urls ? (urls.get(record.storagePath) ?? null) : null;
  // `playing` may stay true on the final frame — nothing is scheduled then.
  const advancing = playing && !atEnd;

  const counter = t.progressPhotos.timelapse.frameCounter
    .replace("{current}", String(frame + 1))
    .replace("{total}", String(ascending.length));

  return (
    <AnimatePresence>
      {open && record ? (
        <motion.div
          key="timelapse-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label={t.progressPhotos.timelapse.title}
        >
          {/* Header chrome */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold">
                {t.progressPhotos.timelapse.title}
              </p>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {t.progressPhotos.poses[record.pose]}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs tabular-nums text-muted-foreground">
                {counter}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label={t.progressPhotos.timelapse.close}
                autoFocus
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>

          {/* Photo stage */}
          <div className="relative flex-1 overflow-hidden p-2">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed blob URLs, next/image cannot optimize them
              <img
                src={url}
                alt={formatLongDate(record.takenAt, t.progressPhotos.months)}
                className="size-full object-contain"
                draggable={false}
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3">
                <Skeleton className="aspect-[3/4] h-2/3" />
                <p className="text-sm text-muted-foreground">
                  {t.progressPhotos.timelapse.loading}
                </p>
              </div>
            )}
          </div>

          {/* Caption + controls */}
          <div className="space-y-3 border-t border-border px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <p className="font-medium">
                {formatLongDate(record.takenAt, t.progressPhotos.months)}
              </p>
              {record.weightKg != null ? (
                <Badge variant="outline" className="text-[11px] font-semibold">
                  {record.weightKg.toFixed(1)} kg
                </Badge>
              ) : null}
            </div>

            <Progress
              value={
                ascending.length > 1 ? (frame / (ascending.length - 1)) * 100 : 100
              }
              aria-label={counter}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    if (atEnd) {
                      setFrame(0);
                      setPlaying(true);
                    } else {
                      setPlaying((p) => !p);
                    }
                  }}
                  disabled={!urls}
                  aria-label={
                    advancing
                      ? t.progressPhotos.timelapse.pause
                      : atEnd
                        ? t.progressPhotos.timelapse.replay
                        : t.progressPhotos.timelapse.play
                  }
                >
                  {advancing ? (
                    <Pause className="size-5" />
                  ) : atEnd ? (
                    <RotateCcw className="size-5" />
                  ) : (
                    <Play className="size-5" />
                  )}
                </Button>
              </div>
              <div
                role="group"
                aria-label={t.progressPhotos.timelapse.speedLabel}
                className="flex gap-2"
              >
                {SPEEDS.map((s) => (
                  <ToggleChip
                    key={s}
                    size="sm"
                    selected={speed === s}
                    onClick={() => setSpeed(s)}
                  >
                    {s.toLocaleString("pl-PL")} s
                  </ToggleChip>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
