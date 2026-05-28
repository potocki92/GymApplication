import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.calendar} — REPIFY`,
};

export default function CalendarPage() {
  return <ComingSoon title={getDictionary().nav.calendar} icon={CalendarDays} />;
}
