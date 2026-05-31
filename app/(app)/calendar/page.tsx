import type { Metadata } from "next";

import { CalendarView } from "@/features/calendar/calendar-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.calendar} — REPIFY`,
};

export default function CalendarPage() {
  return <CalendarView />;
}
