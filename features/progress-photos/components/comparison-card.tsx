"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { useDictionary } from "@/hooks/use-dictionary";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import type { ProgressPhotoRecord } from "@/types";

import { ComparePicker } from "./compare-picker";
import type { ComparePreset, ComparisonEndpoints } from "../use-comparison-endpoints";

// react-compare-image touches `document` on import — load it only on the client.
const ReactCompareImage = dynamic(() => import("react-compare-image"), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[3/4] w-full" />,
});

interface ComparisonCardProps {
  /** Pose-filtered records, newest first. */
  records: ProgressPhotoRecord[];
  cmp: ComparisonEndpoints;
}

export function ComparisonCard({ records, cmp }: ComparisonCardProps) {
  const t = useDictionary();
  const { before, after, preset } = cmp;

  // Ascending feeds the manual pickers (oldest → newest).
  const ascending = useMemo(
    () => [...records].sort((a, b) => (a.takenAt < b.takenAt ? -1 : 1)),
    [records],
  );

  const { url: leftUrl, loading: leftLoading } = useSignedUrl(
    before?.storagePath ?? null,
  );
  const { url: rightUrl, loading: rightLoading } = useSignedUrl(
    after?.storagePath ?? null,
  );

  const presets: { key: ComparePreset; label: string }[] = [
    { key: "transformation", label: t.progressPhotos.sections.presetTransformation },
    { key: "monthToMonth", label: t.progressPhotos.sections.presetMonthToMonth },
    { key: "manual", label: t.progressPhotos.sections.presetManual },
  ];

  const ready =
    leftUrl && rightUrl && !leftLoading && !rightLoading && before && after;
  const samePair = before && after && before.id === after.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.progressPhotos.sections.comparison}</CardTitle>
        <CardDescription>
          {t.progressPhotos.sections.comparisonDesc}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          role="group"
          aria-label={t.progressPhotos.sections.presetLabel}
          className="flex flex-wrap gap-2"
        >
          {presets.map((p) => (
            <ToggleChip
              key={p.key}
              size="sm"
              selected={preset === p.key}
              onClick={() => cmp.setPreset(p.key)}
            >
              {p.label}
            </ToggleChip>
          ))}
        </div>

        {preset === "manual" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ComparePicker
              records={ascending}
              value={before?.id ?? null}
              onChange={cmp.setBefore}
              label={t.progressPhotos.sections.comparisonPickLeft}
              disabledId={after?.id ?? null}
            />
            <ComparePicker
              records={ascending}
              value={after?.id ?? null}
              onChange={cmp.setAfter}
              label={t.progressPhotos.sections.comparisonPickRight}
              disabledId={before?.id ?? null}
            />
          </div>
        ) : null}

        {!before || !after ? (
          <p className="rounded-lg border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
            {preset === "monthToMonth"
              ? t.progressPhotos.comparison.noPair
              : t.progressPhotos.comparison.empty}
          </p>
        ) : samePair ? (
          <p className="rounded-lg border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
            {t.progressPhotos.comparison.same}
          </p>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {ready ? (
                <ReactCompareImage
                  leftImage={leftUrl}
                  rightImage={rightUrl}
                  leftImageAlt={before.notes ?? before.takenAt}
                  rightImageAlt={after.notes ?? after.takenAt}
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
              <Caption record={before} />
              <Caption record={after} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Caption({ record }: { record: ProgressPhotoRecord }) {
  const t = useDictionary();
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
