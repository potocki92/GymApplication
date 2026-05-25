"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Dumbbell } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useDictionary } from "@/hooks/use-dictionary";
import { WEEKDAY_ORDER } from "@/lib/constants";
import { usePlanStore, useWorkoutDraftStore } from "@/store";
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

  const init = useWorkoutDraftStore((s) => s.init);
  const reset = useWorkoutDraftStore((s) => s.reset);
  const exercises = useWorkoutDraftStore((s) => s.exercises);
  const editingId = useWorkoutDraftStore((s) => s.editingWorkoutId);

  useEffect(() => {
    const weekday = resolveWeekday(dayParam);
    const existing = usePlanStore.getState().plan.days.find(
      (d) => d.weekday === weekday,
    )?.workout;
    init(weekday, existing);
    return () => reset();
  }, [dayParam, init, reset]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label={t.common.back}>
            <Link href="/plan">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
              {title}
            </h1>
            <p className="hidden text-sm text-muted-foreground sm:block">
              {t.workoutForm.subtitle}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} size="lg" className="hidden h-10 sm:inline-flex">
          <Check className="size-4" />
          {t.workoutForm.save}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t.workoutForm.titleNew}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <WorkoutForm />
              <Separator />
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">{t.workoutForm.selectedExercises}</h3>
                  <span className="text-xs text-muted-foreground">{exercises.length}</span>
                </div>

                {exercises.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
                    <Dumbbell className="size-6 text-muted-foreground" />
                    <p className="text-sm font-medium">{t.workoutForm.noExercises}</p>
                    <p className="text-xs text-muted-foreground">
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
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>{t.workoutForm.addExerciseToWorkout}</CardTitle>
            </CardHeader>
            <CardContent>
              <ExercisePicker />
            </CardContent>
          </Card>
        </div>
      </div>

      <Button onClick={handleSave} className="h-11 w-full sm:hidden">
        <Check className="size-4" />
        {t.workoutForm.save}
      </Button>
    </div>
  );
}
