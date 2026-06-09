"use client";

import { Dumbbell, Repeat2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatMinutes } from "@/lib/format";
import type { WorkoutTemplate } from "@/types";

export function TemplateCard({
  template,
  onApply,
  onDelete,
}: {
  template: WorkoutTemplate;
  onApply: (template: WorkoutTemplate) => void;
  onDelete: (template: WorkoutTemplate) => void;
}) {
  const t = useDictionary();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate text-base font-semibold">
            {template.name}
          </span>
          {template.type ? (
            <Badge variant="secondary">{template.type}</Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Dumbbell className="size-3.5" />
            {template.exercises.length} {t.plan.exercises.toLowerCase()}
          </span>
          <span>·</span>
          <span>{formatMinutes(template.estimatedDurationMin)}</span>
          {template.usageCount > 0 ? (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Repeat2 className="size-3.5" />
                {t.templates.usageCount}: {template.usageCount}
              </span>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => onApply(template)}>
            {t.templates.apply}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={t.templates.delete}
            title={t.templates.delete}
            onClick={() => onDelete(template)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
