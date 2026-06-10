"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid3x3, ImageIcon, SwitchCamera, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { useDictionary } from "@/hooks/use-dictionary";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import { cn } from "@/lib/utils";
import type { ProgressPhotoRecord } from "@/types";

import { useCameraStream } from "../use-camera-stream";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  /** Most recent photo of the selected pose — rendered as the alignment ghost. */
  ghostRecord: ProgressPhotoRecord | null;
  onCapture: (file: File) => void;
}

/**
 * In-app camera with an optional semi-transparent "ghost" of the previous
 * photo of the same pose, so framing and stance stay repeatable shot-to-shot.
 * The front-camera preview (and ghost) are mirrored for natural alignment,
 * but the captured frame is saved un-mirrored to stay consistent with
 * gallery-uploaded photos.
 */
export function CameraCapture({
  open,
  onClose,
  ghostRecord,
  onCapture,
}: CameraCaptureProps) {
  const t = useDictionary();
  const { videoRef, facing, flip, ready, error } = useCameraStream(open);
  const [ghostOn, setGhostOn] = useState(true);
  const [gridOn, setGridOn] = useState(false);

  const { url: ghostUrl } = useSignedUrl(
    open && ghostRecord ? ghostRecord.storagePath : null,
  );

  // Camera failures are terminal for this overlay — report and close.
  useEffect(() => {
    if (!open || !error) return;
    const messages = t.progressPhotos.camera;
    const message =
      error === "permissionDenied"
        ? messages.permissionDenied
        : error === "noCamera"
          ? messages.noCamera
          : error === "unsupported"
            ? messages.unsupported
            : t.progressPhotos.errors.generic;
    toast.error(message);
    onClose();
  }, [open, error, t, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error(t.progressPhotos.camera.captureFailed);
      return;
    }
    // Draw the raw (un-mirrored) frame — only the preview is flipped.
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error(t.progressPhotos.camera.captureFailed);
          return;
        }
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="camera-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[70] flex flex-col bg-background"
          role="dialog"
          aria-modal="true"
          aria-label={t.progressPhotos.camera.title}
        >
          {/* Header chrome */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
            <p className="truncate text-sm font-semibold">
              {t.progressPhotos.camera.title}
            </p>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label={t.progressPhotos.fullscreen.close}
              autoFocus
            >
              <X className="size-5" />
            </Button>
          </div>

          {/* Viewfinder: video + ghost share one container so the front-camera
              mirror applies to both and alignment stays truthful. */}
          <div className="relative flex-1 overflow-hidden bg-black">
            <div
              className={cn(
                "absolute inset-0",
                facing === "user" && "-scale-x-100",
              )}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="size-full object-contain"
              />
              {ghostOn && ghostUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed blob URLs, next/image cannot optimize them
                <img
                  src={ghostUrl}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute inset-0 size-full object-contain opacity-30"
                  draggable={false}
                />
              ) : null}
            </div>

            {gridOn ? (
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute inset-y-0 left-1/3 border-l border-border/60" />
                <div className="absolute inset-y-0 left-2/3 border-l border-border/60" />
                <div className="absolute inset-x-0 top-1/3 border-t border-border/60" />
                <div className="absolute inset-x-0 top-2/3 border-t border-border/60" />
              </div>
            ) : null}

            {ghostOn && ghostUrl ? (
              <p className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs text-muted-foreground">
                {t.progressPhotos.camera.ghostHint}
              </p>
            ) : null}
          </div>

          {/* Controls */}
          <div className="space-y-3 border-t border-border px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {ghostRecord ? (
                <ToggleChip
                  size="sm"
                  selected={ghostOn}
                  onClick={() => setGhostOn((v) => !v)}
                >
                  <ImageIcon className="size-3.5" />
                  {t.progressPhotos.camera.ghostToggle}
                </ToggleChip>
              ) : null}
              <ToggleChip
                size="sm"
                selected={gridOn}
                onClick={() => setGridOn((v) => !v)}
              >
                <Grid3x3 className="size-3.5" />
                {t.progressPhotos.camera.gridToggle}
              </ToggleChip>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="icon-lg"
                onClick={flip}
                disabled={!ready}
                aria-label={t.progressPhotos.camera.switchCamera}
              >
                <SwitchCamera className="size-5" />
              </Button>
              <button
                type="button"
                onClick={capture}
                disabled={!ready}
                aria-label={t.progressPhotos.camera.capture}
                className="size-16 rounded-full border-4 border-primary bg-primary/20 transition-colors hover:bg-primary/30 disabled:pointer-events-none disabled:opacity-50"
              />
              {/* Spacer keeps the shutter centered. */}
              <div aria-hidden className="size-9" />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
