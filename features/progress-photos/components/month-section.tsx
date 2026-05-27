"use client";

import { useDictionary } from "@/hooks/use-dictionary";
import type { ProgressPhotoRecord } from "@/types";

import { PhotoCard } from "./photo-card";

interface MonthSectionProps {
  monthKey: string; // "YYYY-MM"
  records: ProgressPhotoRecord[];
  onOpen?: (record: ProgressPhotoRecord) => void;
}

function monthTitle(monthKey: string, monthNames: readonly string[]): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return `${monthNames[m - 1] ?? ""} ${y}`;
}

export function MonthSection({ monthKey, records, onOpen }: MonthSectionProps) {
  const t = useDictionary();
  return (
    <section className="space-y-2">
      <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {monthTitle(monthKey, t.progressPhotos.months)}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {records.map((record) => (
          <PhotoCard key={record.id} record={record} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
