import { AppShell } from "@/components/layout/app-shell";
import { SessionRecoveryGate } from "@/features/active-workout/session-recovery-gate";
import { AuthHydrationGate } from "@/features/auth/auth-hydration-gate";
import { HistoryHydrationGate } from "@/features/exercise-history/history-hydration-gate";
import { MetricsHydrationGate } from "@/features/metrics/metrics-hydration-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <AuthHydrationGate />
      <HistoryHydrationGate />
      <MetricsHydrationGate />
      <SessionRecoveryGate />
    </AppShell>
  );
}
