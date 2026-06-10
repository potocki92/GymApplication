"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Columns2, Layers, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  buildCollageBlob,
  shareOrDownloadBlob,
} from "@/lib/progress-photos/collage";
import { formatLongDate } from "@/lib/progress-photos/format";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import type { ProgressPhotoRecord } from "@/types";

import { ComparePicker } from "./compare-picker";
import { ComparisonMetrics } from "./comparison-metrics";
import { OverlayCompare } from "./overlay-compare";
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

type CompareMode = "slider" | "overlay";

export function ComparisonCard({ records, cmp }: ComparisonCardProps) {
  const t = useDictionary();
  const { before, after, preset } = cmp;
  const [mode, setMode] = useState<CompareMode>("slider");
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    if (!ready || !before || !after || !leftUrl || !rightUrl) return;
    setExporting(true);
    try {
      const deltaKg =
        before.weightKg != null && after.weightKg != null
          ? after.weightKg - before.weightKg
          : null;
      const blob = await buildCollageBlob({
        beforeUrl: leftUrl,
        afterUrl: rightUrl,
        beforeLabel: formatLongDate(before.takenAt, t.progressPhotos.months),
        afterLabel: formatLongDate(after.takenAt, t.progressPhotos.months),
        deltaLine:
          deltaKg != null
            ? `${t.progressPhotos.export.weightDelta}: ${deltaKg > 0 ? "+" : deltaKg < 0 ? "−" : "±"}${Math.abs(Math.round(deltaKg * 10) / 10).toLocaleString("pl-PL")} kg`
            : undefined,
        brand: "FitFlow",
      });
      const result = await shareOrDownloadBlob(
        blob,
        `fitflow-progres-${before.takenAt}-${after.takenAt}.jpg`,
      );
      toast.success(
        result === "shared"
          ? t.progressPhotos.export.shared
          : t.progressPhotos.export.downloaded,
      );
    } catch {
      toast.error(t.progressPhotos.export.failed);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.progressPhotos.sections.comparison}</CardTitle>
        <CardDescription>
          {t.progressPhotos.sections.comparisonDesc}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <div
            role="group"
            aria-label={t.progressPhotos.comparison.modeLabel}
            className="flex gap-2"
          >
            <ToggleChip
              size="sm"
              selected={mode === "slider"}
              onClick={() => setMode("slider")}
            >
              <Columns2 className="size-3.5" />
              {t.progressPhotos.comparison.modeSlider}
            </ToggleChip>
            <ToggleChip
              size="sm"
              selected={mode === "overlay"}
              onClick={() => setMode("overlay")}
            >
              <Layers className="size-3.5" />
              {t.progressPhotos.comparison.modeOverlay}
            </ToggleChip>
          </div>
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
                mode === "overlay" ? (
                  <OverlayCompare
                    beforeUrl={leftUrl}
                    afterUrl={rightUrl}
                    beforeAlt={before.notes ?? before.takenAt}
                    afterAlt={after.notes ?? after.takenAt}
                  />
                ) : (
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
                )
              ) : (
                <Skeleton className="aspect-[3/4] w-full" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <Caption record={before} />
              <Caption record={after} />
            </div>

            <ComparisonMetrics before={before} after={after} />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!ready || exporting}
            >
              <Share2 className="size-4" />
              {exporting
                ? t.progressPhotos.export.preparing
                : t.progressPhotos.export.button}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Caption({ record }: { record: ProgressPhotoRecord }) {
  const t = useDictionary();
  const dateLabel = formatLongDate(record.takenAt, t.progressPhotos.months);
  return (
    <div className="space-y-0.5">
      <p className="font-medium text-foreground">{dateLabel}</p>
      {record.weightKg != null ? <p>{record.weightKg.toFixed(1)} kg</p> : null}
      {record.notes ? <p className="line-clamp-2">{record.notes}</p> : null}
    </div>
  );
}
