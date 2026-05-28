"use client";

import { ChevronLeft, ChevronRight, History, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
          <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.history.chart.title}
              </h2>
            </div>
            <SessionProgressChart sessions={filtered} />
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t.history.searchPlaceholder}
              className="sm:max-w-xs"
            />
            <Select
              value={dateRange}
              onValueChange={(v) => {
                setDateRange(v as DateRange);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.history.range.all}</SelectItem>
                <SelectItem value="7d">{t.history.range.last7}</SelectItem>
                <SelectItem value="30d">{t.history.range.last30}</SelectItem>
                <SelectItem value="90d">{t.history.range.last90}</SelectItem>
              </SelectContent>
            </Select>
            <Tabs
              value={ratingFilter}
              onValueChange={(v) => {
                setRatingFilter(v as RatingFilter);
                setPage(1);
              }}
              className="sm:ml-auto"
            >
              <TabsList>
                <TabsTrigger value="all">{t.history.filterAll}</TabsTrigger>
                <TabsTrigger value="rated">{t.history.filterRated}</TabsTrigger>
                <TabsTrigger value="unrated">{t.history.filterUnrated}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

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
