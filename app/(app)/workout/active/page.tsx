import type { Metadata } from "next";

import { ActiveWorkoutView } from "@/features/active-workout/active-workout-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().activeWorkout.title} — REPIFY`,
};

export default function ActiveWorkoutPage() {
  return <ActiveWorkoutView />;
}
