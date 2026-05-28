import type { Metadata } from "next";

import { SettingsView } from "@/features/settings/settings-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.settings} — REPIFY`,
};

export default function SettingsPage() {
  return <SettingsView />;
}
