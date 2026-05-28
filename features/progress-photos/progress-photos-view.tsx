"use client";

import { useMemo, useState } from "react";
import { Camera, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import {
  selectPhotosByMonth,
  selectPhotosByPose,
  useProgressPhotosStore,
} from "@/store";
import type { ProgressPhotoRecord, ProgressPose } from "@/types";

import { ComparisonSlide } from "./components/comparison-slide";
import { FullscreenViewer } from "./components/fullscreen-viewer";
import { MonthSection } from "./components/month-section";
import { MonthToMonthCard } from "./components/month-to-month-card";
import { PoseTabs } from "./components/pose-tabs";
import { TimelineSwiper } from "./components/timeline-swiper";
import { UploadDialog } from "./components/upload-dialog";

export function ProgressPhotosView() {
  const t = useDictionary();
  const records = useProgressPhotosStore((s) => s.records);

  const [pose, setPose] = useState<ProgressPose>("front");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewing, setViewing] = useState<ProgressPhotoRecord | null>(null);

  const filtered = useMemo(
    () => selectPhotosByPose(records, pose),
    [records, pose],
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
      <PageHeader
        title={t.progressPhotos.title}
        description={t.progressPhotos.subtitle}
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" />
            {t.progressPhotos.addPhoto}
          </Button>
        }
      />

      {!hasAny ? (
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
      ) : (
        <>
          <PoseTabs value={pose} onChange={setPose} />

          {!hasInPose ? (
            <EmptyState
              icon={Camera}
              title={t.progressPhotos.emptyTitle}
              description={t.progressPhotos.emptyDescription}
              action={
                <Button variant="outline" onClick={() => setUploadOpen(true)}>
                  <Plus className="size-4" />
                  {t.progressPhotos.addPhoto}
                </Button>
              }
            />
          ) : (
            <>
              <MonthToMonthCard records={records} pose={pose} />

              <Card>
                <CardHeader>
                  <CardTitle>{t.progressPhotos.sections.comparison}</CardTitle>
                  <CardDescription>
                    {t.progressPhotos.sections.comparisonDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ComparisonSlide records={filtered} />
                </CardContent>
              </Card>

              <section className="space-y-2">
                <h2 className="font-heading text-lg font-semibold tracking-tight">
                  {t.progressPhotos.sections.timeline}
                </h2>
                <TimelineSwiper records={filtered} onSelect={setViewing} />
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
                    onOpen={setViewing}
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
      <FullscreenViewer record={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
