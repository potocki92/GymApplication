"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Search } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/hooks/use-dictionary";
import { useTemplatesStore } from "@/store";
import type { Weekday, WorkoutTemplate } from "@/types";
import { ApplyTemplateDialog } from "./components/apply-template-dialog";
import { TemplateCard } from "./components/template-card";

export function TemplatesView() {
  const t = useDictionary();
  const router = useRouter();
  const templates = useTemplatesStore((s) => s.templates);
  const removeTemplate = useTemplatesStore((s) => s.remove);
  const incrementUsage = useTemplatesStore((s) => s.incrementUsage);

  const [query, setQuery] = useState("");
  const [applying, setApplying] = useState<WorkoutTemplate | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (tpl) =>
        tpl.name.toLowerCase().includes(q) ||
        (tpl.type?.toLowerCase().includes(q) ?? false),
    );
  }, [templates, query]);

  const handleDelete = (template: WorkoutTemplate) => {
    void removeTemplate(template.id);
    toast.success(t.templates.deleted);
  };

  const handlePick = (weekday: Weekday) => {
    if (!applying) return;
    const id = applying.id;
    setApplying(null);
    void incrementUsage(id);
    router.push(`/plan/new?day=${weekday}&template=${id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t.templates.title} description={t.templates.subtitle} />

      {templates.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title={t.templates.empty}
          description={t.templates.emptyHint}
        />
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.templates.searchPlaceholder}
              className="pl-9"
            />
          </div>

          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t.templates.noResults}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={setApplying}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ApplyTemplateDialog
        template={applying}
        onOpenChange={(open) => {
          if (!open) setApplying(null);
        }}
        onPick={handlePick}
      />
    </div>
  );
}
