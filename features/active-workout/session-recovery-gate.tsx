"use client";

import { usePathname, useRouter } from "next/navigation";

import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { ResumeSessionDialog } from "./components/resume-session-dialog";

/**
 * Global gate (mounted in the app layout) that offers to resume an interrupted
 * workout found in IndexedDB on a cold load. Suppressed on the active screen, which
 * manages its own session.
 */
export function SessionRecoveryGate() {
  const { pending, resume, discard } = useSessionRecovery();
  const router = useRouter();
  const pathname = usePathname();

  if (pathname?.startsWith("/workout/active")) return null;

  return (
    <ResumeSessionDialog
      open={pending != null}
      workoutName={pending?.workoutName}
      onResume={() => {
        resume();
        router.push("/workout/active");
      }}
      onDiscard={discard}
    />
  );
}
