"use client";

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
import { GripVertical, Plus } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { WORKOUT_TYPE_DOT_CLASSES } from "@/lib/calendar-utils";
import { WEEKDAY_ORDER } from "@/lib/constants";
import { formatMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/store";
import type { Weekday, WorkoutDay } from "@/types";

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
  const addWorkout = usePlanStore((s) => s.addWorkout);
  const removeWorkout = usePlanStore((s) => s.removeWorkout);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const dayByWeekday = new Map(plan.days.map((d) => [d.weekday, d]));

  const handleDragEnd = (event: DragEndEvent) => {
    const from = event.active.id as Weekday;
    const to = event.over?.id as Weekday | undefined;
    if (!to || from === to) return;

    const source = dayByWeekday.get(from);
    const target = dayByWeekday.get(to);
    if (!source?.workout) return;
    if (target?.workout) {
      toast.error(t.calendar.dnd.dayOccupied);
      return;
    }

    removeWorkout(from);
    addWorkout(to, source.workout);
    toast.success(t.calendar.dnd.movedTo);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.calendar.dnd.hint}</p>
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
