import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.stats} — FitFlow`,
};

export default function StatsPage() {
  return <ComingSoon title={getDictionary().nav.stats} icon={BarChart3} />;
}
