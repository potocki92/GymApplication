"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Dumbbell, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDictionary } from "@/hooks/use-dictionary";
import { pluralPl } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { WEEKDAY_ORDER } from "@/lib/constants";
import { templateToWorkout } from "@/lib/template-utils";
import { usePlanStore, useTemplatesStore, useWorkoutDraftStore } from "@/store";
import type { Weekday } from "@/types";
import { ExercisePicker } from "./components/exercise-picker";
import { SelectedExerciseRow } from "./components/selected-exercise-row";
import { WorkoutForm } from "./components/workout-form";

function resolveWeekday(value: string | null): Weekday {
  return value && (WEEKDAY_ORDER as string[]).includes(value)
    ? (value as Weekday)
    : "monday";
}

export function WorkoutFormView() {
  const t = useDictionary();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("day");
  const templateParam = searchParams.get("template");

  const init = useWorkoutDraftStore((s) => s.init);
  const initFromTemplate = useWorkoutDraftStore((s) => s.initFromTemplate);
  const reset = useWorkoutDraftStore((s) => s.reset);
  const exercises = useWorkoutDraftStore((s) => s.exercises);
  const editingId = useWorkoutDraftStore((s) => s.editingWorkoutId);

  const count = exercises.length;
  const hasExercises = count > 0;

  // On mobile the picker lives in a bottom sheet (the desktop layout keeps it
  // inline in a sticky side column).
  const [pickerOpen, setPickerOpen] = useState(false);

  // Briefly pulse the count badge whenever the number of exercises grows.
  const [bump, setBump] = useState(false);
  const prevCount = useRef(count);
  useEffect(() => {
    if (count > prevCount.current) {
      setBump(true);
      const id = setTimeout(() => setBump(false), 220);
      prevCount.current = count;
      return () => clearTimeout(id);
    }
    prevCount.current = count;
  }, [count]);

  const saveLabel = hasExercises
    ? `${t.workoutForm.save} · ${count} ${pluralPl(count, t.workoutForm.exerciseForms)}`
    : t.workoutForm.save;

  useEffect(() => {
    const weekday = resolveWeekday(dayParam);
    if (templateParam) {
      const template = useTemplatesStore
        .getState()
        .templates.find((tpl) => tpl.id === templateParam);
      if (template) {
        initFromTemplate(weekday, templateToWorkout(template));
        return () => reset();
      }
    }
    const existing = usePlanStore.getState().plan.days.find(
      (d) => d.weekday === weekday,
    )?.workout;
    init(weekday, existing);
    return () => reset();
  }, [dayParam, templateParam, init, initFromTemplate, reset]);

  const handleSave = () => {
    const ok = useWorkoutDraftStore.getState().commit();
    if (!ok) {
      const draft = useWorkoutDraftStore.getState();
      toast.error(
        !draft.name.trim() ? t.workoutForm.nameError : t.workoutForm.exerciseError,
      );
      return;
    }
    toast.success(t.workoutForm.saved);
    router.push("/plan");
  };

  const title = editingId ? t.workoutForm.titleEdit : t.workoutForm.titleNew;

  return (
    <div className="space-y-4 pb-24 sm:space-y-6 sm:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon-lg"
            className="-ml-2 mt-0.5 sm:mt-0"
            aria-label={t.common.back}
          >
            <Link href="/plan">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              {t.workoutForm.subtitle}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          size="lg"
          disabled={!hasExercises}
          className="hidden h-10 sm:inline-flex"
        >
          <Check className="size-4" />
          {saveLabel}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)] lg:gap-5">
        <Card className="order-1 lg:col-start-1 lg:row-start-1">
          <CardHeader>
            <CardTitle>{t.workoutForm.detailsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkoutForm />
          </CardContent>
        </Card>

        {/* Desktop: inline sticky picker. On mobile the picker opens in the
            bottom sheet below, so the column stays focused on the workout. */}
        <div className="order-2 hidden lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>{t.workoutForm.addExerciseToWorkout}</CardTitle>
            </CardHeader>
            <CardContent>
              <ExercisePicker />
            </CardContent>
          </Card>
        </div>

        <Card className="order-3 lg:col-start-1 lg:row-start-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>{t.workoutForm.selectedExercises}</CardTitle>
            <span
              className={cn(
                "grid h-6 min-w-[1.625rem] place-items-center rounded-full px-2 text-xs font-bold tabular-nums transition-transform duration-200",
                hasExercises
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
                bump && "scale-[1.18]",
              )}
            >
              {count}
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full lg:hidden"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="size-4" />
              {t.workoutForm.addExercise}
            </Button>

            {exercises.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center sm:py-10">
                <Dumbbell className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium">{t.workoutForm.noExercises}</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  {t.workoutForm.noExercisesHint}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {exercises.map((we) => (
                  <SelectedExerciseRow key={we.id} workoutExercise={we} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile-only picker sheet. */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] lg:hidden">
          <SheetHeader>
            <SheetTitle>{t.workoutForm.addExerciseToWorkout}</SheetTitle>
            <SheetDescription>{t.workoutForm.noExercisesHint}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <ExercisePicker />
          </div>
        </SheetContent>
      </Sheet>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl shadow-background/80 backdrop-blur sm:hidden">
        <Button
          onClick={handleSave}
          disabled={!hasExercises}
          className="h-12 w-full text-base"
        >
          <Check className="size-4" />
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
