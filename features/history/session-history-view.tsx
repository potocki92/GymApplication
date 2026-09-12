"use client";

import { ChevronLeft, ChevronRight, History, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { FilterSection, FilterSheet } from "@/components/shared/filter-sheet";
import { FilterTrigger } from "@/components/shared/filter-trigger";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useDictionary } from "@/hooks/use-dictionary";
import { useGarminIntegrationStore, useHistoryStore, useSessionHistoryStore } from "@/store";
import type { ExerciseHistoryRecord, SessionHistoryRecord } from "@/types";
import { garminActivityToSessionRecord } from "@/lib/garmin/history-mapper";

import { SessionCard } from "./session-card";
import { SessionProgressChart } from "./session-progress-chart";

type RatingFilter = "all" | "rated" | "unrated";
type DateRange = "all" | "7d" | "30d" | "90d";

const PAGE_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

function matchesRating(
  session: SessionHistoryRecord,
  filter: RatingFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "rated") return session.rating != null;
  return session.rating == null;
}

function matchesDateRange(session: SessionHistoryRecord, range: DateRange): boolean {
  if (range === "all") return true;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return session.finishedAt >= Date.now() - days * DAY_MS;
}

export function SessionHistoryView() {
  const t = useDictionary();
  const sessions = useSessionHistoryStore((s) => s.sessions);
  const hydrated = useSessionHistoryStore((s) => s.hydrated);
  const remove = useSessionHistoryStore((s) => s.remove);

  const exerciseRecords = useHistoryStore((s) => s.records);
  const garminActivities = useGarminIntegrationStore((s) => s.recentActivities);
  const garminHydrated = useGarminIntegrationStore((s) => s.hydrated);

  const [query, setQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount =
    (query.trim() === "" ? 0 : 1) +
    (dateRange === "all" ? 0 : 1) +
    (ratingFilter === "all" ? 0 : 1);

  const resetFilters = () => {
    setQuery("");
    setDateRange("all");
    setRatingFilter("all");
    setPage(1);
  };

  const combinedSessions = useMemo<SessionHistoryRecord[]>(() => {
    const garmin = garminActivities.map(garminActivityToSessionRecord);
    return [...sessions, ...garmin];
  }, [sessions, garminActivities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return combinedSessions
      .filter((s) => matchesRating(s, ratingFilter))
      .filter((s) => matchesDateRange(s, dateRange))
      .filter((s) => (q ? s.workoutName.toLowerCase().includes(q) : true))
      .sort((a, b) => b.finishedAt - a.finishedAt);
  }, [combinedSessions, ratingFilter, dateRange, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const recordsBySession = useMemo(() => {
    const m = new Map<string, ExerciseHistoryRecord[]>();
    for (const r of exerciseRecords) {
      const arr = m.get(r.sessionId) ?? [];
      arr.push(r);
      m.set(r.sessionId, arr);
    }
    return m;
  }, [exerciseRecords]);

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success(t.history.deleted);
    } catch (e) {
      console.error(e);
      toast.error(t.history.deleteFailed);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t.history.title} description={t.history.subtitle} />

      {!hydrated || !garminHydrated ? (
        <div className="space-y-3">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : combinedSessions.length === 0 ? (
        <EmptyState
          icon={History}
          title={t.history.empty}
          description={t.history.emptyHint}
        />
      ) : (
        <>
          <Card className="gap-3 px-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-data" />
              <SectionLabel>{t.history.chart.title}</SectionLabel>
            </div>
            <SessionProgressChart sessions={filtered} />
          </Card>

          <FilterTrigger
            onClick={() => setFiltersOpen(true)}
            activeCount={activeFilterCount}
            className="sm:max-w-md"
          />

          <FilterSheet
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            onReset={resetFilters}
            activeCount={activeFilterCount}
          >
            <FilterSection label={t.history.filters.search}>
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t.history.searchPlaceholder}
              />
            </FilterSection>

            <FilterSection label={t.history.filters.range}>
              <Select
                value={dateRange}
                onValueChange={(v) => {
                  setDateRange(v as DateRange);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.history.range.all}</SelectItem>
                  <SelectItem value="7d">{t.history.range.last7}</SelectItem>
                  <SelectItem value="30d">{t.history.range.last30}</SelectItem>
                  <SelectItem value="90d">{t.history.range.last90}</SelectItem>
                </SelectContent>
              </Select>
            </FilterSection>

            <FilterSection label={t.history.filters.rating}>
              <SegmentedControl
                value={ratingFilter}
                onValueChange={(v) => {
                  setRatingFilter(v);
                  setPage(1);
                }}
                aria-label={t.history.filters.rating}
                size="sm"
                options={[
                  { value: "all", label: t.history.filterAll },
                  { value: "rated", label: t.history.filterRated },
                  { value: "unrated", label: t.history.filterUnrated },
                ]}
              />
            </FilterSection>
          </FilterSheet>

          {visible.length === 0 ? (
            <EmptyState
              icon={History}
              title={t.history.empty}
              description={t.history.emptyHint}
            />
          ) : (
            <>
              <ul className="space-y-3">
                {visible.map((s) => (
                  <li key={s.id}>
                    <SessionCard
                      session={s}
                      setsForSession={recordsBySession.get(s.id) ?? []}
                      onDelete={(id) => void handleDelete(id)}
                    />
                  </li>
                ))}
              </ul>

              {totalPages > 1 ? (
                <nav
                  className="flex items-center justify-between gap-3 pt-1"
                  aria-label={t.history.pagination.label}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                  >
                    <ChevronLeft className="size-4" />
                    {t.history.pagination.prev}
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t.history.pagination.status
                      .replace("{page}", String(safePage))
                      .replace("{total}", String(totalPages))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                  >
                    {t.history.pagination.next}
                    <ChevronRight className="size-4" />
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
