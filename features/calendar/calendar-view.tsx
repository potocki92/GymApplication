"use client";

import { useState } from "react";
import { Activity, CalendarDays, LayoutGrid, LineChart } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useDictionary } from "@/hooks/use-dictionary";
import {
  currentLocalISODate,
  useMetricsStore,
  usePlanStore,
  useProgressPhotosStore,
  useSessionHistoryStore,
} from "@/store";

import { ActivityCalendar } from "./components/activity-calendar";
import { MonthCalendar } from "./components/month-calendar";
import { PlanBoard } from "./components/plan-board";

type CalendarMode = "month" | "activity" | "plan" | "timeline";

export function CalendarView() {
  const t = useDictionary();
  const [mode, setMode] = useState<CalendarMode>("month");

  const plan = usePlanStore((s) => s.plan);
  const sessions = useSessionHistoryStore((s) => s.sessions);
  const metrics = useMetricsStore((s) => s.records);
  const photos = useProgressPhotosStore((s) => s.records);
  const todayISO = currentLocalISODate();

  return (
    <div className="space-y-6">
      <PageHeader title={t.calendar.title} description={t.calendar.subtitle} />

      <SegmentedControl
        value={mode}
        onValueChange={setMode}
        aria-label={t.calendar.viewLabel}
        size="sm"
        options={[
          { value: "month", label: t.calendar.views.month, icon: LayoutGrid },
          { value: "activity", label: t.calendar.views.activity, icon: Activity },
          { value: "plan", label: t.calendar.views.plan, icon: CalendarDays },
          { value: "timeline", label: t.calendar.views.timeline, icon: LineChart },
        ]}
      />

      <div>
        {mode === "month" ? (
          <MonthCalendar plan={plan} sessions={sessions} todayISO={todayISO} />
        ) : null}
        {mode === "activity" ? <ActivityCalendar sessions={sessions} /> : null}
        {mode === "plan" ? <PlanBoard /> : null}
        {mode === "timeline" ? (
          <MonthCalendar
            plan={plan}
            sessions={sessions}
            metrics={metrics}
            photos={photos}
            todayISO={todayISO}
            showOverlay
          />
        ) : null}
      </div>
    </div>
  );
}
