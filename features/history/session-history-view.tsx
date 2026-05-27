"use client";

import { History } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeader } from "@/components/shared/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useDictionary } from "@/hooks/use-dictionary";
import { useHistoryStore, useSessionHistoryStore } from "@/store";
import type { ExerciseHistoryRecord, SessionHistoryRecord } from "@/types";

import { SessionCard } from "./session-card";

type RatingFilter = "all" | "rated" | "unrated";

function matchesRating(
  session: SessionHistoryRecord,
  filter: RatingFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "rated") return session.rating != null;
  return session.rating == null;
}

export function SessionHistoryView() {
  const t = useDictionary();
  const sessions = useSessionHistoryStore((s) => s.sessions);
  const hydrated = useSessionHistoryStore((s) => s.hydrated);
  const remove = useSessionHistoryStore((s) => s.remove);

  const exerciseRecords = useHistoryStore((s) => s.records);

  const [query, setQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter((s) => matchesRating(s, ratingFilter))
      .filter((s) => (q ? s.workoutName.toLowerCase().includes(q) : true))
      .sort((a, b) => b.finishedAt - a.finishedAt);
  }, [sessions, ratingFilter, query]);

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
      <SectionHeader title={t.history.title} description={t.history.subtitle} />

      {!hydrated ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={History}
          title={t.history.empty}
          description={t.history.emptyHint}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.history.searchPlaceholder}
              className="sm:max-w-xs"
            />
            <Tabs
              value={ratingFilter}
              onValueChange={(v) => setRatingFilter(v as RatingFilter)}
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
          )}
        </>
      )}
    </div>
  );
}
