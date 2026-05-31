"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { BottomSheet, BottomSheetBody } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import {
  addMonths,
  buildMonthGrid,
  groupSessionsByDay,
  metricsByDay,
  photosByDay,
  plannedWorkoutsByDay,
  weekdayFromISO,
} from "@/lib/calendar-utils";
import { WEEKDAY_ORDER } from "@/lib/constants";
import { formatMonthYearPL, formatWeekdayDatePL } from "@/lib/format";
import type {
  BodyMetricRecord,
  ProgressPhotoRecord,
  SessionHistoryRecord,
  WeeklyPlan,
} from "@/types";

import { CalendarDayCell } from "./calendar-day-cell";
import { DayDetailPanel } from "./day-detail-panel";

export function MonthCalendar({
  plan,
  sessions,
  metrics = [],
  photos = [],
  todayISO,
  showOverlay = false,
}: {
  plan: WeeklyPlan;
  sessions: SessionHistoryRecord[];
  metrics?: BodyMetricRecord[];
  photos?: ProgressPhotoRecord[];
  todayISO: string;
  showOverlay?: boolean;
}) {
  const t = useDictionary();
  const [{ year, month }, setMonth] = useState(() => {
    const today = new Date(`${todayISO}T00:00:00`);
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const [selectedISO, setSelectedISO] = useState<string | null>(null);

  const grid = useMemo(
    () => buildMonthGrid(year, month, todayISO),
    [year, month, todayISO],
  );
  const plannedMap = useMemo(() => plannedWorkoutsByDay(plan), [plan]);
  const sessionsMap = useMemo(() => groupSessionsByDay(sessions), [sessions]);
  const metricsMap = useMemo(
    () => (showOverlay ? metricsByDay(metrics) : new Map()),
    [metrics, showOverlay],
  );
  const photosMap = useMemo(
    () => (showOverlay ? photosByDay(photos) : new Map()),
    [photos, showOverlay],
  );

  const goToMonth = (delta: number) => {
    setMonth((current) => addMonths(current.year, current.month, delta));
    setSelectedISO(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold capitalize">
          {formatMonthYearPL(year, month)}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToMonth(-1)}
            aria-label={t.calendar.prevMonth}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToMonth(1)}
            aria-label={t.calendar.nextMonth}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAY_ORDER.map((weekday) => (
          <span
            key={weekday}
            className="pb-1 text-center text-[0.65rem] font-medium uppercase text-muted-foreground sm:text-xs"
          >
            {t.weekdays.short[weekday]}
          </span>
        ))}
        {grid.map((cell) => (
          <CalendarDayCell
            key={cell.iso}
            iso={cell.iso}
            day={cell.day}
            inCurrentMonth={cell.inCurrentMonth}
            isToday={cell.isToday}
            selected={cell.iso === selectedISO}
            plannedWorkout={plannedMap.get(weekdayFromISO(cell.iso))}
            completedSessions={sessionsMap.get(cell.iso)}
            metric={metricsMap.get(cell.iso)}
            hasPhoto={photosMap.has(cell.iso)}
            showOverlay={showOverlay}
            onSelect={setSelectedISO}
          />
        ))}
      </div>

      <BottomSheet
        open={selectedISO !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedISO(null);
        }}
        title={selectedISO ? formatWeekdayDatePL(selectedISO) : t.calendar.detail.title}
      >
        <BottomSheetBody>
          {selectedISO ? (
            <DayDetailPanel
              iso={selectedISO}
              plannedWorkout={plannedMap.get(weekdayFromISO(selectedISO))}
              completedSessions={sessionsMap.get(selectedISO)}
              metric={metricsMap.get(selectedISO)}
              photo={photosMap.get(selectedISO)}
              showOverlay={showOverlay}
            />
          ) : null}
        </BottomSheetBody>
      </BottomSheet>
    </div>
  );
}
