"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { CategoryFilter, type CategoryFilterValue } from "@/components/shared/category-filter";
import { FilterSection, FilterSheet } from "@/components/shared/filter-sheet";
import { FilterTrigger } from "@/components/shared/filter-trigger";
import { MuscleFilter, type MuscleFilterValue } from "@/components/shared/muscle-filter";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { EXERCISES } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { ExerciseList } from "./components/exercise-list";

export function ExercisesView() {
  const t = useDictionary();
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilterValue>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeCount =
    (muscleFilter === "all" ? 0 : 1) +
    (categoryFilter === "all" ? 0 : 1) +
    (query.trim() === "" ? 0 : 1);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter(
      (ex) =>
        (muscleFilter === "all" || ex.muscleGroup === muscleFilter) &&
        (categoryFilter === "all" || ex.category === categoryFilter) &&
        (q === "" || ex.name.toLowerCase().includes(q)),
    );
  }, [query, muscleFilter, categoryFilter]);

  const reset = () => {
    setQuery("");
    setMuscleFilter("all");
    setCategoryFilter("all");
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t.exercises.title} description={t.exercises.subtitle} />

      <FilterTrigger
        onClick={() => setFiltersOpen(true)}
        activeCount={activeCount}
        className="sm:max-w-md"
      />

      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onReset={reset}
        activeCount={activeCount}
      >
        <FilterSection label={t.exercises.filters.search}>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.exercises.search}
              className="pl-9"
            />
          </div>
        </FilterSection>

        <FilterSection label={t.exercises.filters.muscleGroup}>
          <MuscleFilter value={muscleFilter} onChange={setMuscleFilter} />
        </FilterSection>

        <FilterSection label={t.exercises.filters.category}>
          <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} />
        </FilterSection>
      </FilterSheet>

      <p className="text-sm text-muted-foreground">
        {results.length} {t.exercises.count}
      </p>

      <ExerciseList exercises={results} />
    </div>
  );
}
