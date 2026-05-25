import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.progress} — FitFlow`,
};

export default function ProgressPage() {
  return <ComingSoon title={getDictionary().nav.progress} icon={TrendingUp} />;
}
