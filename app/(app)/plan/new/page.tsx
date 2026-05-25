import { Suspense } from "react";
import type { Metadata } from "next";

import { WorkoutFormView } from "@/features/workout-form/workout-form-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().workoutForm.titleNew} — FitFlow`,
};

export default function NewWorkoutPage() {
  return (
    <Suspense fallback={null}>
      <WorkoutFormView />
    </Suspense>
  );
}
