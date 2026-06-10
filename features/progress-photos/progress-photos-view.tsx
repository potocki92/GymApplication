"use client";

import { useCallback, useMemo, useState } from "react";
import { Camera, Film, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import {
  selectPhotosByMonth,
  selectPhotosByPose,
  useProgressPhotosStore,
} from "@/store";
import type { ProgressPhotoRecord, ProgressPose } from "@/types";

import { CelebrationOverlay } from "./components/celebration-overlay";
import { ComparisonCard } from "./components/comparison-card";
import { FullscreenViewer } from "./components/fullscreen-viewer";
import { MilestoneBadges } from "./components/milestone-badges";
import { MonthSection } from "./components/month-section";
import { PoseTabs } from "./components/pose-tabs";
import { ProgressTimeline } from "./components/progress-timeline";
import { StreakCard } from "./components/streak-card";
import { TimelapsePlayer } from "./components/timelapse-player";
import { TransformationHero } from "./components/transformation-hero";
import { UploadDialog } from "./components/upload-dialog";
import { useComparisonEndpoints } from "./use-comparison-endpoints";

export function ProgressPhotosView() {
  const t = useDictionary();
  const records = useProgressPhotosStore((s) => s.records);

  const [pose, setPose] = useState<ProgressPose>("front");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [timelapseOpen, setTimelapseOpen] = useState(false);

  const filtered = useMemo(
    () => selectPhotosByPose(records, pose),
    [records, pose],
  );

  const cmp = useComparisonEndpoints(filtered, records, pose);

  const openViewer = useCallback(
    (record: ProgressPhotoRecord) => {
      const idx = filtered.findIndex((r) => r.id === record.id);
      if (idx >= 0) setViewerIndex(idx);
    },
    [filtered],
  );

  const byMonth = useMemo(() => {
    const map = selectPhotosByMonth(filtered);
    // Sort: newest month first.
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const hasAny = records.length > 0;
  const hasInPose = filtered.length > 0;

  return (
    <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      {!hasAny ? (
        <>
          <PageHeader
            title={t.progressPhotos.title}
            description={t.progressPhotos.subtitle}
          />
          <EmptyState
            icon={Camera}
            title={t.progressPhotos.emptyTitle}
            description={t.progressPhotos.emptyDescription}
            action={
              <Button onClick={() => setUploadOpen(true)}>
                <Plus className="size-4" />
                {t.progressPhotos.emptyAction}
              </Button>
            }
          />
        </>
      ) : (
        <>
          <PoseTabs value={pose} onChange={setPose} />

          {!hasInPose ? (
            <EmptyState
              icon={Camera}
              title={t.progressPhotos.emptyTitle}
              description={t.progressPhotos.emptyDescription}
              action={
                <Button onClick={() => setUploadOpen(true)}>
                  <Plus className="size-4" />
                  {t.progressPhotos.addPhoto}
                </Button>
              }
            />
          ) : (
            <>
              <TransformationHero
                allRecords={records}
                onAdd={() => setUploadOpen(true)}
              />

              <StreakCard records={records} />

              <MilestoneBadges records={records} />

              <ComparisonCard records={filtered} cmp={cmp} />

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading text-lg font-semibold tracking-tight">
                    {t.progressPhotos.sections.timeline}
                  </h2>
                  {filtered.length >= 3 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimelapseOpen(true)}
                    >
                      <Film className="size-4" />
                      {t.progressPhotos.timelapse.open}
                    </Button>
                  ) : null}
                </div>
                <ProgressTimeline
                  records={filtered}
                  beforeId={cmp.before?.id ?? null}
                  afterId={cmp.after?.id ?? null}
                  onSelect={openViewer}
                />
              </section>

              <section className="space-y-4">
                <h2 className="font-heading text-lg font-semibold tracking-tight">
                  {t.progressPhotos.sections.gallery}
                </h2>
                {byMonth.map(([monthKey, recs]) => (
                  <MonthSection
                    key={monthKey}
                    monthKey={monthKey}
                    records={recs}
                    onOpen={openViewer}
                  />
                ))}
              </section>
            </>
          )}
        </>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultPose={pose}
      />
      <FullscreenViewer
        photos={filtered}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
      />
      <TimelapsePlayer
        photos={filtered}
        open={timelapseOpen}
        onClose={() => setTimelapseOpen(false)}
      />
      <CelebrationOverlay />
    </div>
  );
}
