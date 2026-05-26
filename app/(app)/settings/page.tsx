import type { Metadata } from "next";

import { SectionHeader } from "@/components/shared/section-header";
import { AccountCard } from "@/features/auth/account-card";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().nav.settings} — FitFlow`,
};

export default function SettingsPage() {
  const t = getDictionary();
  return (
    <div className="space-y-6">
      <SectionHeader title={t.nav.settings} />
      <AccountCard />
    </div>
  );
}
