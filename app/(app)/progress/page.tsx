import type { Metadata } from "next";

import { MetricsView } from "@/features/metrics/metrics-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().metrics.title} — FitFlow`,
};

export default function ProgressPage() {
  return <MetricsView />;
}
