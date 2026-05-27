import { AppShell } from "@/components/layout/app-shell";
import { SessionRecoveryGate } from "@/features/active-workout/session-recovery-gate";
import { AuthHydrationGate } from "@/features/auth/auth-hydration-gate";
import { HistoryHydrationGate } from "@/features/exercise-history/history-hydration-gate";
import { MetricsHydrationGate } from "@/features/metrics/metrics-hydration-gate";
import { PlanHydrationGate } from "@/features/plan/plan-hydration-gate";
import { ProfileHydrationGate } from "@/features/profile/profile-hydration-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <AuthHydrationGate />
      <ProfileHydrationGate />
      <PlanHydrationGate />
      <HistoryHydrationGate />
      <MetricsHydrationGate />
      <SessionRecoveryGate />
    </AppShell>
  );
}
