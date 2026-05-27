"use client";

import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDictionary } from "@/hooks/use-dictionary";
import type { ProgressPhotoRecord } from "@/types";

interface ComparePickerProps {
  records: ProgressPhotoRecord[];
  value: string | null;
  onChange: (id: string) => void;
  label: string;
  disabledId?: string | null;
  placeholder?: string;
}

function formatRow(
  record: ProgressPhotoRecord,
  monthNames: readonly string[],
): string {
  const [y, m, d] = record.takenAt.split("-").map(Number);
  if (!y || !m || !d) return record.takenAt;
  const datePart = `${d} ${monthNames[m - 1]?.toLowerCase() ?? ""} ${y}`;
  const weightPart = record.weightKg != null ? ` · ${record.weightKg.toFixed(1)} kg` : "";
  return `${datePart}${weightPart}`;
}

export function ComparePicker({
  records,
  value,
  onChange,
  label,
  disabledId,
  placeholder,
}: ComparePickerProps) {
  const t = useDictionary();
  const months = t.progressPhotos.months;
  const items = useMemo(
    () => records.map((r) => ({ ...r, displayLabel: formatRow(r, months) })),
    [records, months],
  );

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder ?? ""} />
        </SelectTrigger>
        <SelectContent>
          {items.map((r) => (
            <SelectItem key={r.id} value={r.id} disabled={r.id === disabledId}>
              {r.displayLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
