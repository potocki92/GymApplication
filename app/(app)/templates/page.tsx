import type { Metadata } from "next";

import { TemplatesView } from "@/features/templates/templates-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.templates} — REPIFY`,
};

export default function TemplatesPage() {
  return <TemplatesView />;
}
