import type { Metadata } from "next";

import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().onboarding.welcomeTitle} — FitFlow`,
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
