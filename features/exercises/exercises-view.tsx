"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { CategoryFilter, type CategoryFilterValue } from "@/components/shared/category-filter";
import { MuscleFilter, type MuscleFilterValue } from "@/components/shared/muscle-filter";
import { SectionHeader } from "@/components/shared/section-header";
import { Input } from "@/components/ui/input";
import { EXERCISES } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { ExerciseList } from "./components/exercise-list";

export function ExercisesView() {
  const t = useDictionary();
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilterValue>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter(
      (ex) =>
        (muscleFilter === "all" || ex.muscleGroup === muscleFilter) &&
        (categoryFilter === "all" || ex.category === categoryFilter) &&
        (q === "" || ex.name.toLowerCase().includes(q)),
    );
  }, [query, muscleFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      <SectionHeader title={t.exercises.title} description={t.exercises.subtitle} />

      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.exercises.search}
            className="h-10 pl-9"
          />
        </div>
        <MuscleFilter value={muscleFilter} onChange={setMuscleFilter} />
        <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} />
      </div>

      <p className="text-sm text-muted-foreground">
        {results.length} {t.exercises.count}
      </p>

      <ExerciseList exercises={results} />
    </div>
  );
}
