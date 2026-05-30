"use client";

import { motion } from "framer-motion";
import { ImageOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/hooks/use-dictionary";
import type { ProgressPhotoRecord } from "@/types";

interface PhotoCardProps {
  record: ProgressPhotoRecord;
  onOpen?: (record: ProgressPhotoRecord) => void;
  selected?: boolean;
  className?: string;
}

function formatDate(iso: string, monthNames: readonly string[]): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const month = monthNames[m - 1] ?? "";
  return `${d} ${month.toLowerCase()} ${y}`;
}

export function PhotoCard({ record, onOpen, selected, className }: PhotoCardProps) {
  const t = useDictionary();
  const { url, loading } = useSignedUrl(record.thumbPath);

  return (
    <motion.button
      type="button"
      layoutId={`photo-${record.id}`}
      onClick={() => onOpen?.(record)}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative block w-full overflow-hidden rounded-xl border border-border bg-card text-left focus-visible:outline-2 focus-visible:outline-primary",
        selected && "ring-2 ring-primary",
        className,
      )}
    >
      <div className="relative aspect-square w-full bg-muted">
        {loading ? (
          <Skeleton className="absolute inset-0" />
        ) : url ? (
          // Pure <img> here — signed-URL hosts change per request and bypassing
          // next/image avoids configuring remotePatterns for project-specific
          // Supabase URLs in the loader. The thumb is already 400px wide.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={record.notes ?? record.takenAt}
            className="absolute inset-0 size-full object-cover transition-opacity group-hover:opacity-90"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageOff className="size-6" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {t.progressPhotos.poses[record.pose]}
          </Badge>
        </div>
        {record.weightKg != null ? (
          <div className="absolute right-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">
            {record.weightKg.toFixed(1)} kg
          </div>
        ) : null}
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium">
          {formatDate(record.takenAt, t.progressPhotos.months)}
        </p>
        {record.notes ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {record.notes}
          </p>
        ) : null}
      </div>
    </motion.button>
  );
}
