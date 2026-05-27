import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { IntegrationsView } from "@/features/integrations/integrations-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.integrations} — FitFlow`,
};

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <IntegrationsView />
    </Suspense>
  );
}
