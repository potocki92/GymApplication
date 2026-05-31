"use client";

import { useState } from "react";
import { Activity, CalendarDays, LayoutGrid, LineChart } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

      <Tabs value={mode} onValueChange={(value) => setMode(value as CalendarMode)}>
        <TabsList className="w-full">
          <TabsTrigger value="month">
            <LayoutGrid />
            {t.calendar.views.month}
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity />
            {t.calendar.views.activity}
          </TabsTrigger>
          <TabsTrigger value="plan">
            <CalendarDays />
            {t.calendar.views.plan}
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <LineChart />
            {t.calendar.views.timeline}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="mt-4">
          <MonthCalendar plan={plan} sessions={sessions} todayISO={todayISO} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityCalendar sessions={sessions} />
        </TabsContent>
        <TabsContent value="plan" className="mt-4">
          <PlanBoard />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <MonthCalendar
            plan={plan}
            sessions={sessions}
            metrics={metrics}
            photos={photos}
            todayISO={todayISO}
            showOverlay
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
