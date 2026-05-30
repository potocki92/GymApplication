"use client";

import { useMemo } from "react";
import { ImageOff } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartContainer } from "@/components/shared/chart/chart-container";
import {
  CHART_AXIS_PROPS,
  CHART_COLORS,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_PROPS,
} from "@/components/shared/chart/chart-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatDatePL } from "@/lib/format";
import { useSignedUrl } from "@/lib/progress-photos/use-signed-url";
import { cn } from "@/lib/utils";
import type { ProgressPhotoRecord } from "@/types";

// Plot-area insets shared by the chart and the thumbnail strip so the two
// align horizontally. Must match the chart's YAxis width and right margin.
const AXIS_WIDTH = 36;
const RIGHT_MARGIN = 12;

interface ProgressTimelineProps {
  records: ProgressPhotoRecord[];
  /** Photo currently shown on the "before" side of the comparison slider. */
  beforeId?: string | null;
  /** Photo currently shown on the "after" side of the comparison slider. */
  afterId?: string | null;
  onSelect?: (record: ProgressPhotoRecord) => void;
}

/** ISO date (date-only) → local-midnight epoch ms, avoiding timezone drift. */
function epochOf(takenAt: string): number {
  return new Date(`${takenAt}T00:00:00`).getTime();
}

/** Local-midnight epoch → ISO date string (YYYY-MM-DD). */
function isoOf(epoch: number): string {
  const d = new Date(epoch);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function ProgressTimeline({
  records,
  beforeId,
  afterId,
  onSelect,
}: ProgressTimelineProps) {
  const t = useDictionary();

  // Oldest first reads as a left-to-right timeline.
  const ordered = useMemo(
    () => [...records].sort((a, b) => (a.takenAt < b.takenAt ? -1 : 1)),
    [records],
  );

  const { min, max } = useMemo(() => {
    if (ordered.length === 0) return { min: 0, max: 0 };
    return {
      min: epochOf(ordered[0].takenAt),
      max: epochOf(ordered[ordered.length - 1].takenAt),
    };
  }, [ordered]);

  const points = useMemo(
    () =>
      ordered
        .filter((r) => r.weightKg != null)
        .map((r) => ({ t: epochOf(r.takenAt), weightKg: r.weightKg as number })),
    [ordered],
  );

  if (records.length === 0) return null;

  const span = max - min;
  const positionPct = (takenAt: string) =>
    span > 0 ? ((epochOf(takenAt) - min) / span) * 100 : 50;

  return (
    <div className="space-y-3">
      <ChartContainer
        heightClass="h-48"
        isEmpty={points.length < 2}
        emptyTitle={t.progressPhotos.timeline.weightEmpty}
        emptyDescription={t.progressPhotos.timeline.weightEmptyHint}
      >
        <AreaChart
          data={points}
          margin={{ top: 8, right: RIGHT_MARGIN, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="progressWeightFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis
            {...CHART_AXIS_PROPS}
            type="number"
            dataKey="t"
            scale="time"
            domain={[min, max]}
            tickFormatter={(v: number) => formatDatePL(isoOf(v))}
            minTickGap={24}
          />
          <YAxis {...CHART_AXIS_PROPS} domain={["auto", "auto"]} width={AXIS_WIDTH} />
          <Tooltip
            {...CHART_TOOLTIP_PROPS}
            formatter={(value) => [`${value} kg`, t.progressPhotos.timeline.weightSeries]}
            labelFormatter={(label) =>
              typeof label === "number" ? formatDatePL(isoOf(label)) : ""
            }
          />
          <Area
            type="monotone"
            dataKey="weightKg"
            name={t.progressPhotos.timeline.weightSeries}
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            fill="url(#progressWeightFill)"
            dot={{ r: 2.5, fill: CHART_COLORS.primary }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ChartContainer>

      {/* Thumbnail strip, positioned along the same time axis as the chart. */}
      <div
        className="relative h-16"
        style={{ paddingLeft: AXIS_WIDTH, paddingRight: RIGHT_MARGIN }}
      >
        <div className="relative h-full">
          {ordered.map((record, i) => (
            <div
              key={record.id}
              className="absolute top-0 -translate-x-1/2"
              style={{ left: `${positionPct(record.takenAt)}%`, zIndex: i }}
            >
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
          ))}
        </div>
      </div>
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

  return (
    <button
      type="button"
      onClick={() => onSelect?.(record)}
      title={record.takenAt}
      className={cn(
        "group relative block size-11 overflow-hidden rounded-md border border-border bg-muted transition-all",
        endpoint === "after" && "ring-2 ring-primary",
        endpoint === "before" && "ring-2 ring-accent",
      )}
    >
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
          <ImageOff className="size-4" />
        </div>
      )}
      {endpoint ? (
        <span className="absolute inset-x-0 bottom-0 bg-background/80 px-0.5 text-center text-[8px] font-semibold uppercase leading-tight backdrop-blur">
          {endpoint === "after"
            ? t.progressPhotos.timeline.after
            : t.progressPhotos.timeline.before}
        </span>
      ) : null}
    </button>
  );
}
