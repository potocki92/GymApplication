"use client";

import { usePathname, useRouter } from "next/navigation";

import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { useActiveSessionStore } from "@/store";
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
  const hydrationStatus = useActiveSessionStore((s) => s.hydrationStatus);

  if (hydrationStatus === "idle" || hydrationStatus === "loading") return null;
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
