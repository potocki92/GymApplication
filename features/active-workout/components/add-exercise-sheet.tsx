"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { ListRow } from "@/components/shared/list-row";
import { ExerciseIcon } from "@/components/shared/exercise-icon";
import { MuscleFilter, type MuscleFilterValue } from "@/components/shared/muscle-filter";
import { AppSheet, AppSheetBody } from "@/components/ui/app-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/hooks/use-dictionary";
import { EXERCISES } from "@/data";
import { useActiveSessionStore } from "@/store";
import type { ActiveSession } from "@/types";

/**
 * Picker for adding an exercise mid-session. Renders its own trigger button and
 * opens the standard `AppSheet` — the sheet body is the only scroll region, so
 * the list grows with the sheet instead of nesting a second scroller.
 */
export function AddExerciseSheet({
  session,
  onAdded,
}: {
  session: ActiveSession;
  /** Called after an exercise is added (e.g. to close a parent menu). */
  onAdded?: () => void;
}) {
  const t = useDictionary();
  const addExerciseToSession = useActiveSessionStore((s) => s.addExerciseToSession);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MuscleFilterValue>("all");

  const inSessionIds = useMemo(
    () => new Set(session.exercises.map((e) => e.exerciseId)),
    [session.exercises],
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
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        {t.activeWorkout.addExercise}
      </Button>

      <AppSheet
        open={open}
        onOpenChange={setOpen}
        title={t.activeWorkout.addExerciseSheetTitle}
        description={t.activeWorkout.addExerciseHint}
        className="h-[85dvh]"
      >
        <AppSheetBody className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.workoutForm.searchExercise}
              className="pl-9"
            />
          </div>

          <MuscleFilter value={filter} onChange={setFilter} />

          <div className="flex flex-col gap-2">
            {results.map((ex) => {
              const added = inSessionIds.has(ex.id);
              return (
                <ListRow
                  key={ex.id}
                  leading={
                    <ExerciseIcon
                      muscleGroup={ex.muscleGroup}
                      category={ex.category}
                      image={ex.image}
                      name={ex.name}
                      className="size-10"
                      iconClassName="size-4.5"
                    />
                  }
                  title={ex.name}
                  description={t.muscleGroups[ex.muscleGroup]}
                  trailing={
                    added ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-data">
                        <Check className="size-4" />
                        <span className="sr-only sm:not-sr-only">
                          {t.activeWorkout.alreadyInSession}
                        </span>
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label={`${t.activeWorkout.addExercise}: ${ex.name}`}
                        onClick={() => {
                          addExerciseToSession(ex);
                          toast.success(t.activeWorkout.exerciseAddedToast);
                          setOpen(false);
                          onAdded?.();
                        }}
                      >
                        <Plus className="size-4" />
                      </Button>
                    )
                  }
                />
              );
            })}

            {results.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t.exercises.empty}
              </p>
            ) : null}
          </div>
        </AppSheetBody>
      </AppSheet>
    </>
  );
}
