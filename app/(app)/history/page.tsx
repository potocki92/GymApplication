import type { Metadata } from "next";

import { SessionHistoryView } from "@/features/history/session-history-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().history.title} — FitFlow`,
};

export default function HistoryPage() {
  return <SessionHistoryView />;
}
