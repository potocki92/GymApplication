import type { ComponentType } from "react";

import { SectionHeader } from "@/components/shared/section-header";
import { useDictionary } from "@/hooks/use-dictionary";

export function ComingSoon({
  title,
  icon: Icon,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
}) {
  const t = useDictionary();

  return (
    <div className="space-y-6">
      <SectionHeader title={title} />
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Icon className="size-7" />
        </span>
        <h2 className="font-heading text-lg font-semibold">{t.common.comingSoon}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{t.common.comingSoonDesc}</p>
      </div>
    </div>
  );
}
