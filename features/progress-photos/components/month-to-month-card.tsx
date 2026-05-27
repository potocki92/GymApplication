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
import { useDictionary } from "@/hooks/use-dictionary";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import { selectLatestPerMonth } from "@/store";
import type { ProgressPhotoRecord, ProgressPose } from "@/types";

const ReactCompareImage = dynamic(() => import("react-compare-image"), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[3/4] w-full" />,
});

interface MonthToMonthCardProps {
  records: ProgressPhotoRecord[];
  pose: ProgressPose;
}

function monthLabel(iso: string, months: readonly string[]): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return `${months[m - 1] ?? ""} ${y}`;
}

export function MonthToMonthCard({ records, pose }: MonthToMonthCardProps) {
  const t = useDictionary();

  const pair = useMemo(() => {
    const latest = selectLatestPerMonth(records, pose);
    if (latest.length < 2) return null;
    return { later: latest[0], earlier: latest[1] };
  }, [records, pose]);

  const { url: leftUrl } = useSignedUrl(pair?.earlier?.storagePath ?? null);
  const { url: rightUrl } = useSignedUrl(pair?.later?.storagePath ?? null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.progressPhotos.sections.monthToMonth}</CardTitle>
        <CardDescription>{t.progressPhotos.sections.monthToMonthDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        {!pair ? (
          <p className="text-sm text-muted-foreground">
            {t.progressPhotos.comparison.noPair}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {leftUrl && rightUrl ? (
                <ReactCompareImage
                  leftImage={leftUrl}
                  rightImage={rightUrl}
                  sliderLineColor="var(--color-primary)"
                  sliderLineWidth={2}
                  leftImageLabel={monthLabel(
                    pair.earlier!.takenAt,
                    t.progressPhotos.months,
                  )}
                  rightImageLabel={monthLabel(
                    pair.later!.takenAt,
                    t.progressPhotos.months,
                  )}
                  hover={false}
                />
              ) : (
                <Skeleton className="aspect-[3/4] w-full" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Side record={pair.earlier!} />
              <Side record={pair.later!} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Side({ record }: { record: ProgressPhotoRecord }) {
  const t = useDictionary();
  return (
    <div className="space-y-0.5">
      <p className="font-medium text-foreground">
        {monthLabel(record.takenAt, t.progressPhotos.months)}
      </p>
      {record.weightKg != null ? (
        <p className="text-muted-foreground">{record.weightKg.toFixed(1)} kg</p>
      ) : null}
    </div>
  );
}
