import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.settings} — FitFlow`,
};

export default function SettingsPage() {
  return <ComingSoon title={getDictionary().nav.settings} icon={Settings} />;
}
