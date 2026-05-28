import type { Metadata } from "next";

import { StatsView } from "@/features/stats/stats-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.stats} — REPIFY`,
};

export default function StatsPage() {
  return <StatsView />;
}
