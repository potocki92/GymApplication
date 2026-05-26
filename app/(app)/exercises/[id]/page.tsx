import type { Metadata } from "next";

import { getExerciseById } from "@/data";
import { ExerciseHistoryView } from "@/features/exercise-history/exercise-history-view";
import { getDictionary } from "@/lib/i18n";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const ex = getExerciseById(id);
  const t = getDictionary();
  return { title: `${ex?.name ?? t.exercises.detail.notFound} — FitFlow` };
}

export default async function ExerciseDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ExerciseHistoryView exerciseId={id} />;
}
