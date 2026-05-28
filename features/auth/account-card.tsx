"use client";

import { useEffect } from "react";
import { KeyRound, LogOut, UserCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/hooks/use-dictionary";
import { useSignOut } from "@/hooks/use-sign-out";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAccessStore, useAuthStore } from "@/store";
import type { SubscriptionPlanId, UserRole } from "@/types";

/**
 * Account widget for the settings page. Hidden when Supabase isn't configured —
 * in fully-local mode there's nothing to sign out of.
 */
export function AccountCard() {
  const t = useDictionary();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const accessUser = useAccessStore((s) => s.user);
  const capabilities = useAccessStore((s) => s.capabilities);
  const accessHydrated = useAccessStore((s) => s.hydrated);
  const accessLoading = useAccessStore((s) => s.loading);
  const hydrateAccess = useAccessStore((s) => s.hydrate);
  const handleSignOut = useSignOut();

  useEffect(() => {
    if (initialized && user && !accessHydrated && !accessLoading) {
      void hydrateAccess();
    }
  }, [accessHydrated, accessLoading, hydrateAccess, initialized, user]);

  if (!isSupabaseConfigured()) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="size-5" />
          {t.auth.account}
        </CardTitle>
        {initialized && user ? (
          <CardDescription>{user.email}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {initialized && user ? (
          <AccessSummary
            loading={!accessHydrated || accessLoading}
            userRole={accessUser?.role ?? null}
            planId={accessUser?.planId ?? null}
            capabilities={capabilities}
          />
        ) : null}

        <Button variant="outline" onClick={handleSignOut} disabled={!user}>
          <LogOut className="size-4" />
          {t.auth.signOut}
        </Button>
      </CardContent>
    </Card>
  );
}

function AccessSummary({
  loading,
  userRole,
  planId,
  capabilities,
}: {
  loading: boolean;
  userRole: UserRole | null;
  planId: SubscriptionPlanId | null;
  capabilities: {
    garminConnect: boolean;
    manageSystem: boolean;
    hiddenDevPanel: boolean;
  } | null;
}) {
  const t = useDictionary();
  const access = t.auth.access;

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4" aria-live="polite">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <KeyRound className="size-4" />
          {access.loading}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  if (!userRole || !planId || !capabilities) {
    return (
      <p className="rounded-md border border-dashed border-border bg-card/40 p-3 text-sm text-muted-foreground">
        {access.unavailable}
      </p>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/50 p-4" aria-label={access.title}>
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <KeyRound className="size-4" />
          {access.title}
        </h3>
        <p className="text-xs text-muted-foreground">{access.description}</p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <AccessField label={access.role} value={access.roles[userRole]} />
        <AccessField label={access.plan} value={access.plans[planId]} />
      </dl>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {access.capabilities}
        </p>
        <div className="flex flex-wrap gap-2">
          <CapabilityBadge label={access.garminConnect} enabled={capabilities.garminConnect} />
          <CapabilityBadge label={access.manageSystem} enabled={capabilities.manageSystem} />
          <CapabilityBadge label={access.hiddenDevPanel} enabled={capabilities.hiddenDevPanel} />
        </div>
      </div>
    </section>
  );
}

function AccessField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function CapabilityBadge({ label, enabled }: { label: string; enabled: boolean }) {
  const t = useDictionary();

  return (
    <Badge
      variant={enabled ? "default" : "outline"}
      className={cn(!enabled && "text-muted-foreground")}
      title={enabled ? t.auth.access.enabled : t.auth.access.disabled}
    >
      {label}
    </Badge>
  );
}
