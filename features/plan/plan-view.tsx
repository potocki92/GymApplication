"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { WeeklyPlan } from "./components/weekly-plan";

export function PlanView() {
  const t = useDictionary();

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t.plan.title}
        description={t.plan.subtitle}
        action={
          <Button asChild size="lg" className="h-10">
            <Link href="/plan/new">
              <Plus className="size-4" />
              {t.plan.addWorkout}
            </Link>
          </Button>
        }
      />
      <WeeklyPlan gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" />
    </div>
  );
}
