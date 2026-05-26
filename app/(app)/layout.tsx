import { AppShell } from "@/components/layout/app-shell";
import { SessionRecoveryGate } from "@/features/active-workout/session-recovery-gate";
import { HistoryHydrationGate } from "@/features/exercise-history/history-hydration-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <HistoryHydrationGate />
      <SessionRecoveryGate />
    </AppShell>
  );
}
