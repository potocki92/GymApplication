"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";

import { ExerciseIcon } from "@/components/shared/exercise-icon";
import { MuscleFilter, type MuscleFilterValue } from "@/components/shared/muscle-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXERCISES } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { useWorkoutDraftStore } from "@/store";

export function ExercisePicker() {
  const t = useDictionary();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MuscleFilterValue>("all");

  const addExercise = useWorkoutDraftStore((s) => s.addExercise);
  const selected = useWorkoutDraftStore((s) => s.exercises);
  const addedIds = useMemo(
    () => new Set(selected.map((e) => e.exerciseId)),
    [selected],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter(
      (ex) =>
        (filter === "all" || ex.muscleGroup === filter) &&
        (q === "" || ex.name.toLowerCase().includes(q)),
    );
  }, [query, filter]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.workoutForm.searchExercise}
          className="h-10 pl-9"
        />
      </div>

      <MuscleFilter value={filter} onChange={setFilter} />

      <ScrollArea className="h-[22rem] pr-3">
        <div className="space-y-2">
          {results.map((ex) => {
            const added = addedIds.has(ex.id);
            return (
              <div
                key={ex.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
              >
                <ExerciseIcon
                  muscleGroup={ex.muscleGroup}
                  category={ex.category}
                  image={ex.image}
                  name={ex.name}
                  className="size-9"
                  iconClassName="size-4.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{ex.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.muscleGroups[ex.muscleGroup]}
                  </p>
                </div>
                {added ? (
                  <Button type="button" size="sm" variant="ghost" disabled className="text-success">
                    <Check className="size-4" />
                    {t.workoutForm.alreadyAdded}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label={t.workoutForm.addToWorkout}
                    onClick={() => addExercise(ex)}
                  >
                    <Plus className="size-4" />
                  </Button>
                )}
              </div>
            );
          })}

          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t.exercises.empty}
            </p>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
