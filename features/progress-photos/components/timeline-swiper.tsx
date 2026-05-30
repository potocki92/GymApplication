"use client";

import "swiper/css";
import { ImageOff } from "lucide-react";
import { FreeMode, Mousewheel } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/hooks/use-dictionary";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import { cn } from "@/lib/utils";
import type { ProgressPhotoRecord } from "@/types";

interface TimelineSwiperProps {
  records: ProgressPhotoRecord[];
  /** Photo currently shown on the "before" side of the comparison slider. */
  beforeId?: string | null;
  /** Photo currently shown on the "after" side of the comparison slider. */
  afterId?: string | null;
  onSelect?: (record: ProgressPhotoRecord) => void;
}

export function TimelineSwiper({
  records,
  beforeId,
  afterId,
  onSelect,
}: TimelineSwiperProps) {
  if (records.length === 0) return null;

  // Oldest first reads as a left-to-right timeline.
  const ordered = [...records].sort((a, b) =>
    a.takenAt < b.takenAt ? -1 : 1,
  );

  return (
    <div className="-mx-1">
      <Swiper
        modules={[FreeMode, Mousewheel]}
        slidesPerView="auto"
        spaceBetween={8}
        freeMode={{ enabled: true, momentum: true }}
        mousewheel={{ forceToAxis: true }}
        className="px-1"
      >
        {ordered.map((record, i) => {
          const prev = ordered[i - 1];
          const newMonth =
            !prev || prev.takenAt.slice(0, 7) !== record.takenAt.slice(0, 7);
          return (
            <SwiperSlide key={record.id} style={{ width: "auto" }}>
              <div className="flex items-stretch gap-2">
                {newMonth ? <MonthDivider iso={record.takenAt} /> : null}
                <TimelineTile
                  record={record}
                  endpoint={
                    record.id === afterId
                      ? "after"
                      : record.id === beforeId
                        ? "before"
                        : null
                  }
                  onSelect={onSelect}
                />
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}

function MonthDivider({ iso }: { iso: string }) {
  const t = useDictionary();
  const [, m] = iso.split("-").map(Number);
  const label = m ? t.progressPhotos.months[m - 1]?.slice(0, 3) ?? "" : "";
  return (
    <div className="flex flex-col items-center justify-center self-stretch pr-1">
      <span className="h-full w-px bg-border" />
      <span className="mt-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function TimelineTile({
  record,
  endpoint,
  onSelect,
}: {
  record: ProgressPhotoRecord;
  endpoint: "before" | "after" | null;
  onSelect?: (record: ProgressPhotoRecord) => void;
}) {
  const t = useDictionary();
  const { url, loading } = useSignedUrl(record.thumbPath);
  const [y, m, d] = record.takenAt.split("-").map(Number);
  const monthLabel = m ? t.progressPhotos.months[m - 1]?.slice(0, 3) ?? "" : "";
  const dateLabel = y && d ? `${d} ${monthLabel}` : record.takenAt;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(record)}
      className={cn(
        "group flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-1 transition-all",
        endpoint === "after" && "ring-2 ring-primary",
        endpoint === "before" && "ring-2 ring-accent",
      )}
    >
      <div className="relative size-16 overflow-hidden rounded-md bg-muted">
        {loading ? (
          <Skeleton className="absolute inset-0" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={record.takenAt}
            className="size-full object-cover transition-opacity"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageOff className="size-5" />
          </div>
        )}
        {endpoint ? (
          <span className="absolute left-1 top-1 rounded bg-background/80 px-1 text-[8px] font-semibold uppercase leading-tight backdrop-blur">
            {endpoint === "after"
              ? t.progressPhotos.timeline.after
              : t.progressPhotos.timeline.before}
          </span>
        ) : null}
      </div>
      <span className="px-1 text-[10px] font-medium leading-tight">
        {dateLabel}
      </span>
      {record.weightKg != null ? (
        <span className="text-[9px] leading-none text-muted-foreground">
          {record.weightKg.toFixed(1)} kg
        </span>
      ) : null}
    </button>
  );
}
