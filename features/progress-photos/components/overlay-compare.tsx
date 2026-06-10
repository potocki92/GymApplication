"use client";

import { useState } from "react";

import { Slider } from "@/components/ui/slider";
import { useDictionary } from "@/hooks/use-dictionary";

interface OverlayCompareProps {
  beforeUrl: string;
  afterUrl: string;
  beforeAlt: string;
  afterAlt: string;
}

/**
 * Onion-skin comparison: both photos stacked, the newer one fading in/out via
 * an opacity slider. Best for spotting silhouette changes when the pose and
 * framing are consistent.
 */
export function OverlayCompare({
  beforeUrl,
  afterUrl,
  beforeAlt,
  afterAlt,
}: OverlayCompareProps) {
  const t = useDictionary();
  const [opacity, setOpacity] = useState(50);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed blob URLs, next/image cannot optimize them */}
        <img
          src={beforeUrl}
          alt={beforeAlt}
          className="absolute inset-0 size-full object-contain"
          draggable={false}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- signed blob URLs, next/image cannot optimize them */}
        <img
          src={afterUrl}
          alt={afterAlt}
          className="absolute inset-0 size-full object-contain"
          style={{ opacity: opacity / 100 }}
          draggable={false}
        />
      </div>
      <div className="flex items-center gap-3 px-3 pb-3">
        <span className="text-xs text-muted-foreground">
          {t.progressPhotos.comparison.leftLabel}
        </span>
        <Slider
          value={[opacity]}
          onValueChange={(v) => setOpacity(v[0] ?? 50)}
          min={0}
          max={100}
          step={1}
          aria-label={t.progressPhotos.comparison.opacityLabel}
        />
        <span className="text-xs text-muted-foreground">
          {t.progressPhotos.comparison.rightLabel}
        </span>
      </div>
    </div>
  );
}
