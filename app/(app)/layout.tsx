import { AppShell } from "@/components/layout/app-shell";
import { ActiveWorkoutHydrationGate } from "@/features/active-workout/active-workout-hydration-gate";
import { SessionRecoveryGate } from "@/features/active-workout/session-recovery-gate";
import { AuthHydrationGate } from "@/features/auth/auth-hydration-gate";
import { HistoryHydrationGate } from "@/features/exercise-history/history-hydration-gate";
import { SessionHistoryHydrationGate } from "@/features/exercise-history/session-history-hydration-gate";
import { GarminIntegrationHydrationGate } from "@/features/integrations/garmin-integration-hydration-gate";
import { MetricsHydrationGate } from "@/features/metrics/metrics-hydration-gate";
import { PlanHydrationGate } from "@/features/plan/plan-hydration-gate";
import { ProfileHydrationGate } from "@/features/profile/profile-hydration-gate";
import { ProgressPhotosHydrationGate } from "@/features/progress-photos/progress-photos-hydration-gate";
import { GoalsHydrationGate } from "@/features/goals/goals-hydration-gate";
import { StepsHydrationGate } from "@/features/steps/steps-hydration-gate";
import { TemplatesHydrationGate } from "@/features/templates/templates-hydration-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <AuthHydrationGate />
      <ProfileHydrationGate />
      <PlanHydrationGate />
      <HistoryHydrationGate />
      <SessionHistoryHydrationGate />
      <MetricsHydrationGate />
      <ProgressPhotosHydrationGate />
      <StepsHydrationGate />
      <GoalsHydrationGate />
      <TemplatesHydrationGate />
      <GarminIntegrationHydrationGate />
      <ActiveWorkoutHydrationGate />
      <SessionRecoveryGate />
    </AppShell>
  );
}
