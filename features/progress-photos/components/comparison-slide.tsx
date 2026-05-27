"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/hooks/use-dictionary";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import type { ProgressPhotoRecord } from "@/types";

import { ComparePicker } from "./compare-picker";

// react-compare-image directly touches `document` on import — we load it only
// on the client. SSR rendering of the picker still works.
const ReactCompareImage = dynamic(() => import("react-compare-image"), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[3/4] w-full" />,
});

interface ComparisonSlideProps {
  records: ProgressPhotoRecord[];
}

export function ComparisonSlide({ records }: ComparisonSlideProps) {
  const t = useDictionary();

  // Sorted ascending: index 0 = oldest, last = newest. We default left=oldest,
  // right=newest so the slider naturally reads "before → after".
  const ascending = useMemo(
    () => [...records].sort((a, b) => (a.takenAt < b.takenAt ? -1 : 1)),
    [records],
  );

  const [leftIdOverride, setLeftId] = useState<string | null>(null);
  const [rightIdOverride, setRightId] = useState<string | null>(null);

  // If the user hasn't picked yet (or their pick is no longer in the list)
  // fall back to oldest/newest. This keeps the component robust when the
  // parent filters `records` (e.g. switching pose) — selection auto-resets.
  const oldestId = ascending[0]?.id ?? null;
  const newestId = ascending[ascending.length - 1]?.id ?? null;
  const leftId =
    leftIdOverride && ascending.some((r) => r.id === leftIdOverride)
      ? leftIdOverride
      : oldestId;
  const rightId =
    rightIdOverride && ascending.some((r) => r.id === rightIdOverride)
      ? rightIdOverride
      : newestId;

  const left = ascending.find((r) => r.id === leftId) ?? null;
  const right = ascending.find((r) => r.id === rightId) ?? null;

  const { url: leftUrl, loading: leftLoading } = useSignedUrl(
    left?.storagePath ?? null,
  );
  const { url: rightUrl, loading: rightLoading } = useSignedUrl(
    right?.storagePath ?? null,
  );

  if (ascending.length < 2) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
        {t.progressPhotos.comparison.empty}
      </p>
    );
  }

  if (left && right && left.id === right.id) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
        {t.progressPhotos.comparison.same}
      </p>
    );
  }

  const ready = leftUrl && rightUrl && !leftLoading && !rightLoading;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ComparePicker
          records={ascending}
          value={leftId}
          onChange={setLeftId}
          label={t.progressPhotos.sections.comparisonPickLeft}
          disabledId={rightId}
        />
        <ComparePicker
          records={ascending}
          value={rightId}
          onChange={setRightId}
          label={t.progressPhotos.sections.comparisonPickRight}
          disabledId={leftId}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {ready ? (
          <ReactCompareImage
            leftImage={leftUrl}
            rightImage={rightUrl}
            leftImageAlt={left?.notes ?? left?.takenAt ?? ""}
            rightImageAlt={right?.notes ?? right?.takenAt ?? ""}
            sliderLineColor="var(--color-primary)"
            sliderLineWidth={2}
            leftImageLabel={t.progressPhotos.comparison.leftLabel}
            rightImageLabel={t.progressPhotos.comparison.rightLabel}
            hover={false}
          />
        ) : (
          <Skeleton className="aspect-[3/4] w-full" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <Caption record={left} />
        <Caption record={right} />
      </div>
    </div>
  );
}

function Caption({ record }: { record: ProgressPhotoRecord | null }) {
  const t = useDictionary();
  if (!record) return <span />;
  const [y, m, d] = record.takenAt.split("-").map(Number);
  const dateLabel =
    y && m && d
      ? `${d} ${t.progressPhotos.months[m - 1]?.toLowerCase() ?? ""} ${y}`
      : record.takenAt;
  return (
    <div className="space-y-0.5">
      <p className="font-medium text-foreground">{dateLabel}</p>
      {record.weightKg != null ? <p>{record.weightKg.toFixed(1)} kg</p> : null}
      {record.notes ? <p className="line-clamp-2">{record.notes}</p> : null}
    </div>
  );
}
