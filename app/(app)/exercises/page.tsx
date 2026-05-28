import type { Metadata } from "next";

import { ExercisesView } from "@/features/exercises/exercises-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().exercises.title} — REPIFY`,
};

export default function ExercisesPage() {
  return <ExercisesView />;
}
