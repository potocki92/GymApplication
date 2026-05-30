"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ArrowDown, ArrowUp, Camera, Minus } from "lucide-react";

import { AnimatedCounter } from "@/components/shared/animated-counter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/hooks/use-dictionary";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import { summarizeProgress } from "@/lib/progress-photos/streak-utils";
import { cn } from "@/lib/utils";
import type { ProgressPhotoRecord } from "@/types";

const ReactCompareImage = dynamic(() => import("react-compare-image"), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[3/4] w-full" />,
});

interface TransformationHeroProps {
  /** Pose-filtered records (newest first). */
  filtered: ProgressPhotoRecord[];
  /** All records across poses — drives library-wide counters. */
  allRecords: ProgressPhotoRecord[];
  onAdd: () => void;
}

export function TransformationHero({
  filtered,
  allRecords,
  onAdd,
}: TransformationHeroProps) {
  const t = useDictionary();

  const before = filtered.at(-1) ?? null; // oldest in pose
  const after = filtered[0] ?? null; // newest in pose
  const hasPair = !!before && !!after && before.id !== after.id;

  const summary = useMemo(() => summarizeProgress(allRecords), [allRecords]);

  const { url: beforeUrl } = useSignedUrl(hasPair ? before.storagePath : null);
  const { url: afterUrl } = useSignedUrl(hasPair ? after.storagePath : null);

  const delta = summary.weightDeltaKg;
  const DeltaIcon = delta == null ? Minus : delta < 0 ? ArrowDown : ArrowUp;
  const deltaTone =
    delta == null
      ? "text-muted-foreground"
      : delta < 0
        ? "text-primary"
        : "text-accent";

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/5 p-4 ring-1 ring-primary/20 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t.progressPhotos.hero.title}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t.progressPhotos.subtitle}
          </p>
        </div>
        <Button onClick={onAdd} className="shrink-0">
          <Camera className="size-4" />
          {t.progressPhotos.hero.cta}
        </Button>
      </div>

      {hasPair ? (
        <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-border">
          {beforeUrl && afterUrl ? (
            <ReactCompareImage
              leftImage={beforeUrl}
              rightImage={afterUrl}
              sliderLineColor="var(--color-primary)"
              sliderLineWidth={2}
              leftImageLabel={t.progressPhotos.hero.before}
              rightImageLabel={t.progressPhotos.hero.after}
              hover={false}
            />
          ) : (
            <Skeleton className="aspect-[3/4] w-full" />
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
          {t.progressPhotos.hero.noPair}
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label={t.progressPhotos.summary.total}>
          <AnimatedCounter value={summary.total} />
        </Stat>
        <Stat label={t.progressPhotos.summary.days}>
          <AnimatedCounter value={summary.spanDays} />
        </Stat>
        <Stat label={t.progressPhotos.summary.weightChange}>
          {delta == null ? (
            <span className="text-muted-foreground">
              {t.progressPhotos.summary.noWeight}
            </span>
          ) : (
            <span className={cn("inline-flex items-center gap-1", deltaTone)}>
              <DeltaIcon className="size-5" />
              <AnimatedCounter value={Math.abs(delta)} decimals={1} suffix=" kg" />
            </span>
          )}
        </Stat>
      </div>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-background/40 px-3 py-2 text-center ring-1 ring-border">
      <p className="font-heading text-xl font-semibold tabular-nums">{children}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
