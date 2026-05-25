import type { Metadata } from "next";

import { PlanView } from "@/features/plan/plan-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().plan.title} — FitFlow`,
};

export default function PlanPage() {
  return <PlanView />;
}
