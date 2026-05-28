import type { Metadata } from "next";

import { ProgressPhotosView } from "@/features/progress-photos/progress-photos-view";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().progressPhotos.title} — REPIFY`,
};

export default function ProgressPhotosPage() {
  return <ProgressPhotosView />;
}
