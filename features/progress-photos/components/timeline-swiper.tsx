"use client";

import "swiper/css";
import { FreeMode, Mousewheel } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { useDictionary } from "@/hooks/use-dictionary";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import { cn } from "@/lib/utils";
import type { ProgressPhotoRecord } from "@/types";

interface TimelineSwiperProps {
  records: ProgressPhotoRecord[];
  selectedId?: string | null;
  onSelect?: (record: ProgressPhotoRecord) => void;
}

export function TimelineSwiper({
  records,
  selectedId,
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
        {ordered.map((record) => (
          <SwiperSlide key={record.id} style={{ width: "auto" }}>
            <TimelineTile
              record={record}
              selected={record.id === selectedId}
              onSelect={onSelect}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

function TimelineTile({
  record,
  selected,
  onSelect,
}: {
  record: ProgressPhotoRecord;
  selected?: boolean;
  onSelect?: (record: ProgressPhotoRecord) => void;
}) {
  const t = useDictionary();
  const { url } = useSignedUrl(record.thumbPath);
  const [y, m, d] = record.takenAt.split("-").map(Number);
  const monthLabel = m ? t.progressPhotos.months[m - 1]?.slice(0, 3) ?? "" : "";
  const dateLabel = y && d ? `${d} ${monthLabel}` : record.takenAt;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(record)}
      className={cn(
        "group flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-1 transition-all",
        selected && "ring-2 ring-primary",
      )}
    >
      <div className="relative size-16 overflow-hidden rounded-md bg-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={record.takenAt}
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </div>
      <span className="px-1 text-[10px] font-medium leading-tight">
        {dateLabel}
      </span>
    </button>
  );
}
