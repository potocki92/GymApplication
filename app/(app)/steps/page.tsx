import type { Metadata } from "next";

import { StepsView } from "@/features/steps/steps-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.steps} — REPIFY`,
};

export default function StepsPage() {
  return <StepsView />;
}
