import { AppShell } from "@/components/layout/app-shell";
import { SessionRecoveryGate } from "@/features/active-workout/session-recovery-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <SessionRecoveryGate />
    </AppShell>
  );
}
