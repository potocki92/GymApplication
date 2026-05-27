"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { getDictionary } from "@/lib/i18n";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: ErrorProps) {
  const t = getDictionary();
  useEffect(() => {
    // Surface unexpected app-tree errors for diagnostics. Replace with a real
    // logger (Sentry, Logflare) when one is wired up.
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-8">
      <ErrorState
        title={t.errors.unexpectedTitle}
        description={t.errors.unexpectedDesc}
        retryLabel={t.errors.retry}
        onRetry={reset}
      />
    </div>
  );
}
