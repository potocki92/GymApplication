"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { useMetricsStore } from "@/store";
import type { BodyMetricKey, BodyMetricRecord } from "@/types";
import { ComparativeChart } from "./comparative-chart";
import { GoalProgressCard } from "./goal-progress-card";
import { MetricFormDialog } from "./metric-form-dialog";
import { MetricHistoryList } from "./metric-history-list";
import { MetricSelector } from "./metric-selector";
import { WeightChart } from "./weight-chart";

export function MetricsView() {
  const t = useDictionary();
  const records = useMetricsStore((s) => s.records);
  const goal = useMetricsStore((s) => s.goal);
  const upsert = useMetricsStore((s) => s.upsert);

  const [metric, setMetric] = useState<BodyMetricKey>("weightKg");
  const [primary, setPrimary] = useState<BodyMetricKey>("weightKg");
  const [secondary, setSecondary] = useState<BodyMetricKey>("waistCm");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BodyMetricRecord | null>(null);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: BodyMetricRecord) => {
    setEditing(r);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.metrics.title}
        description={t.metrics.subtitle}
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" />
            {t.metrics.addMeasurement}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t.metrics.chartTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MetricSelector value={metric} onChange={setMetric} />
              <WeightChart records={records} metric={metric} goal={goal} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <GoalProgressCard />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.metrics.comparative.title}</CardTitle>
          <CardDescription>{t.metrics.comparative.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {t.metrics.comparative.primary}
              </p>
              <MetricSelector value={primary} onChange={setPrimary} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {t.metrics.comparative.secondary}
              </p>
              <MetricSelector value={secondary} onChange={setSecondary} />
            </div>
          </div>
          <ComparativeChart
            records={records}
            primary={primary}
            secondary={secondary}
          />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionHeader title={t.metrics.history} />
        <MetricHistoryList onEdit={openEdit} />
      </section>

      <MetricFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={(r) => {
          void upsert(r);
          toast.success(t.metrics.quickAddSaved);
        }}
      />
    </div>
  );
}
