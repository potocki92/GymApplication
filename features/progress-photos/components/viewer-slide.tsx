"use client";

import { useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";

import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import type { ProgressPhotoRecord } from "@/types";

interface ViewerSlideProps {
  record: ProgressPhotoRecord;
  /** Carry the shared-element transition only for the originally opened photo. */
  withLayoutId: boolean;
  onClose: () => void;
  onPaginate: (dir: 1 | -1) => void;
  canPrev: boolean;
  canNext: boolean;
  onZoomChange?: (zoomed: boolean) => void;
}

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 280;
const SWIPE_THRESHOLD = 110;

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/**
 * A single zoomable photo in the fullscreen viewer. Owns pinch-to-zoom,
 * double-tap zoom, pan while zoomed, and — at scale 1 — drag-to-close
 * (vertical) / drag-to-paginate (horizontal). All gestures are hand-rolled on
 * Pointer Events so they coexist with the shared-element `layoutId` transition
 * without a third-party zoom library fighting Framer's layout animation.
 */
export function ViewerSlide({
  record,
  withLayoutId,
  onClose,
  onPaginate,
  canPrev,
  canNext,
  onZoomChange,
}: ViewerSlideProps) {
  const { url: thumbUrl } = useSignedUrl(record.thumbPath);
  const { url: fullUrl } = useSignedUrl(record.storagePath);
  const [fullLoaded, setFullLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useMotionValue(1);
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);

  // Pointer / gesture bookkeeping (refs so we don't re-render mid-gesture).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const mode = useRef<"none" | "pan" | "pinch" | "swipe">("none");
  const last = useRef({ x: 0, y: 0 });
  const swipeStart = useRef({ x: 0, y: 0, t: 0 });
  const pinchStart = useRef({ dist: 0, scale: 1, midX: 0, midY: 0, tx: 0, ty: 0 });
  const lastTap = useRef({ t: 0, x: 0, y: 0 });

  const aspect =
    record.width && record.height ? `${record.width} / ${record.height}` : "3 / 4";

  // This component is remounted per photo (the parent keys it by `record.id`),
  // so motion values and `fullLoaded` reset naturally — no reset effect needed.

  const emitZoom = () => onZoomChange?.(scale.get() > 1.01);

  const clampPan = () => {
    const el = containerRef.current;
    if (!el) return;
    const s = scale.get();
    const maxX = ((s - 1) * el.clientWidth) / 2;
    const maxY = ((s - 1) * el.clientHeight) / 2;
    tx.set(Math.max(-maxX, Math.min(maxX, tx.get())));
    ty.set(Math.max(-maxY, Math.min(maxY, ty.get())));
  };

  const center = () => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    return rect
      ? { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 }
      : { cx: 0, cy: 0 };
  };

  const zoomTo = (target: number, focalX?: number, focalY?: number) => {
    const { cx, cy } = center();
    const s0 = scale.get();
    const s1 = Math.max(1, Math.min(MAX_SCALE, target));
    const fx = (focalX ?? cx) - cx;
    const fy = (focalY ?? cy) - cy;
    const t0x = tx.get();
    const t0y = ty.get();
    const t1x = s1 === 1 ? 0 : fx - (fx - t0x) * (s1 / s0);
    const t1y = s1 === 1 ? 0 : fy - (fy - t0y) * (s1 / s0);
    animate(scale, s1, spring);
    animate(tx, t1x, spring).then(clampPan);
    animate(ty, t1y, spring);
    onZoomChange?.(s1 > 1.01);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    last.current = { x: e.clientX, y: e.clientY };

    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const { cx, cy } = center();
      pinchStart.current = {
        dist: Math.hypot(dx, dy),
        scale: scale.get(),
        midX: (pts[0].x + pts[1].x) / 2 - cx,
        midY: (pts[0].y + pts[1].y) / 2 - cy,
        tx: tx.get(),
        ty: ty.get(),
      };
      mode.current = "pinch";
    } else if (scale.get() > 1.01) {
      mode.current = "pan";
    } else {
      mode.current = "swipe";
      swipeStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (mode.current === "pinch" && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const { cx, cy } = center();
      const dist = Math.hypot(dx, dy);
      const start = pinchStart.current;
      const ratio = start.dist > 0 ? dist / start.dist : 1;
      const s1 = Math.max(1, Math.min(MAX_SCALE, start.scale * ratio));
      const curMidX = (pts[0].x + pts[1].x) / 2 - cx;
      const curMidY = (pts[0].y + pts[1].y) / 2 - cy;
      scale.set(s1);
      tx.set(
        start.midX -
          (start.midX - start.tx) * (s1 / start.scale) +
          (curMidX - start.midX),
      );
      ty.set(
        start.midY -
          (start.midY - start.ty) * (s1 / start.scale) +
          (curMidY - start.midY),
      );
      clampPan();
      return;
    }

    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };

    if (mode.current === "pan") {
      tx.set(tx.get() + dx);
      ty.set(ty.get() + dy);
      clampPan();
    } else if (mode.current === "swipe") {
      tx.set(e.clientX - swipeStart.current.x);
      ty.set(e.clientY - swipeStart.current.y);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);

    if (mode.current === "pinch") {
      if (pointers.current.size < 2) {
        mode.current = pointers.current.size === 1 ? "pan" : "none";
        if (scale.get() <= 1.05) zoomTo(1);
        else clampPan();
        emitZoom();
      }
      return;
    }

    if (mode.current === "swipe") {
      const offX = e.clientX - swipeStart.current.x;
      const offY = e.clientY - swipeStart.current.y;
      // Double-tap detection (negligible movement).
      if (Math.abs(offX) < 8 && Math.abs(offY) < 8) {
        const now = Date.now();
        if (
          now - lastTap.current.t < DOUBLE_TAP_MS &&
          Math.abs(e.clientX - lastTap.current.x) < 30 &&
          Math.abs(e.clientY - lastTap.current.y) < 30
        ) {
          zoomTo(DOUBLE_TAP_SCALE, e.clientX, e.clientY);
          lastTap.current = { t: 0, x: 0, y: 0 };
        } else {
          lastTap.current = { t: now, x: e.clientX, y: e.clientY };
          animate(tx, 0, spring);
          animate(ty, 0, spring);
        }
        mode.current = "none";
        return;
      }

      // Horizontal paginate vs vertical close.
      if (Math.abs(offX) > Math.abs(offY)) {
        if (offX < -SWIPE_THRESHOLD && canNext) return onPaginate(1);
        if (offX > SWIPE_THRESHOLD && canPrev) return onPaginate(-1);
      } else if (Math.abs(offY) > SWIPE_THRESHOLD) {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate(10);
        }
        return onClose();
      }
      animate(tx, 0, spring);
      animate(ty, 0, spring);
      mode.current = "none";
      return;
    }

    if (pointers.current.size === 0) mode.current = "none";
  };

  return (
    <div
      ref={containerRef}
      className="relative flex size-full touch-none items-center justify-center overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <motion.div
        layoutId={withLayoutId ? `photo-${record.id}` : undefined}
        className="relative max-h-full max-w-full"
        style={{ aspectRatio: aspect, scale, x: tx, y: ty }}
      >
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full scale-105 object-contain blur-md"
            draggable={false}
          />
        ) : null}
        {fullUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fullUrl}
            alt={record.notes ?? record.takenAt}
            onLoad={() => setFullLoaded(true)}
            className="relative size-full select-none object-contain transition-opacity duration-300"
            style={{ opacity: fullLoaded ? 1 : 0 }}
            draggable={false}
          />
        ) : (
          <div className="size-full animate-pulse rounded-lg bg-muted" />
        )}
      </motion.div>
    </div>
  );
}
