import type { Metadata } from "next";

import { GoalsView } from "@/features/goals/goals-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.goals} — REPIFY`,
};

export default function GoalsPage() {
  return <GoalsView />;
}
