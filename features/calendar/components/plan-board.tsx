"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { ChevronLeft, ChevronRight, GripVertical, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { WORKOUT_TYPE_DOT_CLASSES } from "@/lib/calendar-utils";
import { WEEKDAY_ORDER } from "@/lib/constants";
import { formatDatePL, formatMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { currentLocalISODate, usePlanStore } from "@/store";
import type { Weekday, WorkoutDay } from "@/types";

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekStartOf(iso: string): string {
  const date = parseLocalDate(iso);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return toLocalISODate(date);
}

function addDaysISO(iso: string, days: number): string {
  const date = parseLocalDate(iso);
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
}

function DraggableWorkout({ day }: { day: WorkoutDay }) {
  const t = useDictionary();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: day.weekday });
  const workout = day.workout!;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "rounded-lg border border-border bg-card p-2.5",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label={t.calendar.dnd.hint}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                WORKOUT_TYPE_DOT_CLASSES[workout.type ?? "Custom"],
              )}
            />
            <p className="truncate text-sm font-medium">{workout.name}</p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t.plan.exercises}: {workout.exercises.length} ·{" "}
            {formatMinutes(workout.estimatedDurationMin)}
          </p>
        </div>
      </div>
    </div>
  );
}

function DayColumn({ day }: { day: WorkoutDay }) {
  const t = useDictionary();
  const { setNodeRef, isOver } = useDroppable({ id: day.weekday });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "min-h-28 transition-colors",
        isOver && "ring-2 ring-primary",
        day.rest && !day.workout && "border-dashed bg-muted/30",
      )}
    >
      <CardContent className="space-y-2 p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          {t.weekdays.short[day.weekday]}
        </p>
        {day.workout ? (
          <DraggableWorkout day={day} />
        ) : (
          <Link
            href={`/plan/new?day=${day.weekday}`}
            className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-border py-3 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="size-3.5" />
            {t.calendar.dnd.addHere}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function PlanBoard() {
  const t = useDictionary();
  const plan = usePlanStore((s) => s.plan);
  const viewedWeeks = usePlanStore((s) => s.viewedWeeks);
  const loadViewedWeek = usePlanStore((s) => s.loadViewedWeek);
  const moveWorkout = usePlanStore((s) => s.moveWorkout);

  const [weekStart, setWeekStart] = useState(() => plan.weekStart);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    void loadViewedWeek(weekStart);
  }, [weekStart, loadViewedWeek]);

  const weekPlan =
    weekStart === plan.weekStart ? plan : viewedWeeks[weekStart];

  const dayByWeekday = useMemo(() => {
    const days = weekPlan?.days ?? WEEKDAY_ORDER.map((weekday) => ({ weekday, rest: false }));
    return new Map(days.map((d) => [d.weekday, d] as const));
  }, [weekPlan]);

  const handleDragEnd = (event: DragEndEvent) => {
    const from = event.active.id as Weekday;
    const to = event.over?.id as Weekday | undefined;
    if (!to || from === to) return;

    if (dayByWeekday.get(to)?.workout) {
      toast.error(t.calendar.dnd.dayOccupied);
      return;
    }
    if (moveWorkout(weekStart, from, to)) {
      toast.success(t.calendar.dnd.movedTo);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t.calendar.dnd.hint}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {t.calendar.weekOf} {formatDatePL(weekStart)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(weekStartOf(currentLocalISODate()))}
          >
            {t.calendar.today}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((w) => addDaysISO(w, -7))}
            aria-label={t.calendar.prevWeek}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((w) => addDaysISO(w, 7))}
            aria-label={t.calendar.nextWeek}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {WEEKDAY_ORDER.map((weekday) => (
            <DayColumn key={weekday} day={dayByWeekday.get(weekday)!} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
