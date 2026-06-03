"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/shared/section-header";
import { useDictionary } from "@/hooks/use-dictionary";
import { useAppleHealthIntegrationStore, useGarminIntegrationStore } from "@/store";

import { AppleHealthCard } from "./components/apple-health-card";
import { GarminCard } from "./components/garmin-card";
import { AppleHealthHydrationGate } from "./apple-health-hydration-gate";
import { GarminIntegrationHydrationGate } from "./garmin-integration-hydration-gate";

export function IntegrationsView() {
  const t = useDictionary();
  const hydrated = useGarminIntegrationStore((s) => s.hydrated);
  const demoMode = useGarminIntegrationStore((s) => s.demoMode);
  const garminAvailable = useGarminIntegrationStore((s) => s.available);
  const appleHealthAvailable = useAppleHealthIntegrationStore((s) => s.available);
  const searchParams = useSearchParams();
  const consumedRef = useRef(false);

  // Surface OAuth callback outcomes once. Strip the params via History API so a
  // refresh doesn't re-fire the toast.
  useEffect(() => {
    if (consumedRef.current) return;
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (!connected && !error) return;
    consumedRef.current = true;

    if (connected === "garmin") {
      toast.success(t.integrations.garmin.connectSuccess);
    } else if (error) {
      toast.error(
        t.integrations.garmin.connectError.replace("{reason}", error),
      );
    }

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      url.searchParams.delete("error");
      url.searchParams.delete("mode");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, t.integrations.garmin]);

  return (
    <div className="space-y-6">
      <GarminIntegrationHydrationGate />
      <AppleHealthHydrationGate />
      <SectionHeader
        title={t.integrations.title}
        description={t.integrations.subtitle}
      />

      <p className="rounded-md border border-dashed border-border bg-card/40 p-3 text-xs text-muted-foreground">
        {t.integrations.privacyNote}
      </p>

      {demoMode ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          {t.integrations.garmin.demoBanner}
        </p>
      ) : null}

      {!hydrated ? (
        <Skeleton className="h-64 w-full" />
      ) : garminAvailable || appleHealthAvailable ? (
        <div className="grid gap-4">
          {garminAvailable ? <GarminCard /> : null}
          {appleHealthAvailable ? <AppleHealthCard /> : null}
        </div>
      ) : null}
    </div>
  );
}
